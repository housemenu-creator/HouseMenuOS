/**
 * API Gateway — Cloud Function HTTP
 *
 * Stable front door for the House automation pipeline.
 * Replaces the cloudflared tunnel as the destination for Event Dispatcher.
 * Routes: events → n8n, webhooks → RTDB, health checks.
 *
 * Deploy:
 *   firebase deploy --only functions:apiGateway
 *
 * @see docs/AUTOMATION_ARCHITECTURE.md §7
 */

import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { createHmac, timingSafeEqual } from 'node:crypto';
initializeApp();

// ponytail: secrets as env vars for dev; switch to defineSecret in prod
const HOUSE_WEBHOOK_SECRET = () => process.env.HOUSE_WEBHOOK_SECRET || 'dev';
const N8N_API_KEY = () => process.env.N8N_API_KEY || 'dev';

// ── Config ──────────────────────────────────────────────

async function getN8nUrl() {
  try {
    const db = getDatabase();
    const snap = await db.ref('tenants/portal/config/pipeline/n8n/url').once('value');
    const url = snap.val();
    if (typeof url === 'string' && url.startsWith('http')) return url;
  } catch {}
  return process.env.N8N_WEBHOOK_URL || null;
}

function validateSignature(body, signature) {
  if (!signature || !HOUSE_WEBHOOK_SECRET()) return false;
  const payload = JSON.stringify(body);
  const hmac = createHmac('sha256', HOUSE_WEBHOOK_SECRET());
  hmac.update(payload);
  const expected = `sha256=${hmac.digest('hex')}`;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return signature === expected;
  }
}

// ── Event Forwarder ────────────────────────────────────

/**
 * POST /api/v1/events/forward
 *
 * Receives events from Event Dispatcher (or any internal service),
 * validates signature, forwards to n8n, returns n8n response.
 *
 * Expected body: { eventId, type, tenantId, ... }
 * Headers: Authorization: Bearer <key>, X-House-Signature: sha256=...
 */
export const forwardEvent = onRequest(
  {
    region: 'us-central1',
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const event = req.body;
    if (!event || !event.eventId) {
      res.status(400).json({ error: 'eventId required' });
      return;
    }

    // Validate HMAC signature
    const signature = req.headers['x-house-signature'];
    if (!validateSignature(event, signature)) {
      console.warn(`[api] Invalid signature for event ${event.eventId}`);
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Get n8n URL
    const n8nUrl = await getN8nUrl();
    if (!n8nUrl) {
      console.error('[api] No n8n URL configured');
      res.status(502).json({ error: 'n8n not configured' });
      return;
    }

    console.log(`[api] Forwarding event ${event.eventId} (${event.type}) to n8n`);

    try {
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${N8N_API_KEY()}`,
          'X-House-Tenant': event.tenantId || 'portal',
          'Idempotency-Key': event.eventId,
        },
        body: JSON.stringify({ body: event }),
        signal: AbortSignal.timeout(55_000),
      });

      const responseBody = await response.text();

      if (response.ok) {
        console.log(`[api] n8n OK for event ${event.eventId}`);
        res.status(200).json({
          forwarded: true,
          eventId: event.eventId,
          n8nStatus: response.status,
        });
      } else {
        console.warn(`[api] n8n returned ${response.status} for event ${event.eventId}`);
        res.status(response.status).json({
          forwarded: false,
          eventId: event.eventId,
          error: `n8n: ${response.status}`,
          detail: responseBody.slice(0, 500),
        });
      }
    } catch (err) {
      console.error(`[api] n8n request failed for event ${event.eventId}:`, err.message);
      res.status(502).json({
        forwarded: false,
        eventId: event.eventId,
        error: err.message,
      });
    }
  }
);

// ── n8n Callback ───────────────────────────────────────

/**
 * POST /api/v1/webhooks/return
 *
 * n8n calls this when a workflow completes (success or failure).
 * Updates the event status in RTDB.
 */
export const webhookReturn = onRequest(
  {
    region: 'us-central1',
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${N8N_API_KEY()}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { eventId, workflowId, status, result, error } = req.body;
    if (!eventId) {
      res.status(400).json({ error: 'eventId required' });
      return;
    }

    console.log(`[api] n8n callback: event=${eventId} workflow=${workflowId} status=${status}`);

    // Update the event in RTDB done/ path with callback result
    try {
      const db = getDatabase();
      await db.ref(`events/portal/done/${eventId}`).update({
        callbackStatus: status,
        callbackResult: result || null,
        callbackError: error || null,
        callbackAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[api] Failed to update event ${eventId}:`, err.message);
    }

    res.status(200).json({ received: true, eventId });
  }
);

// ── Supplier Webhook ───────────────────────────────────

/**
 * POST /api/v1/webhooks/supplier/{supplierId}
 *
 * Suppliers call this to confirm, mark ready, or reject POs.
 */
export const webhookSupplier = onRequest(
  {
    region: 'us-central1',
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const supplierId = req.params.supplierId || req.path.split('/').pop();
    const { event, purchaseOrderId, notes } = req.body;

    if (!event || !purchaseOrderId) {
      res.status(400).json({ error: 'event and purchaseOrderId required' });
      return;
    }

    const statusMap = {
      'order.confirmed': 'confirmed',
      'order.ready': 'ready',
      'order.rejected': 'cancelled',
    };

    const newStatus = statusMap[event];
    if (!newStatus) {
      res.status(400).json({ error: `Unknown supplier event: ${event}` });
      return;
    }

    // Update PO status in RTDB — scan branches for the PO
    // ponytail: linear scan, fine for <5 branches
    try {
      const db = getDatabase();
      const branches = await db.ref('purchaseOrders').once('value');
      if (branches.exists()) {
        for (const [branchId, orders] of Object.entries(branches.val())) {
          if (orders[purchaseOrderId]) {
            const entry = { status: newStatus, timestamp: new Date().toISOString(), by: `supplier:${supplierId}` };
            const history = orders[purchaseOrderId].statusHistory || [];
            history.push(entry);
            await db.ref(`purchaseOrders/${branchId}/${purchaseOrderId}`).update({
              status: newStatus,
              statusHistory: history,
              updatedAt: new Date().toISOString(),
            });

            // Publish event for n8n to continue the workflow
            await db.ref(`events/portal/pending/${purchaseOrderId}-${event}`).set({
              type: `purchase_order.${newStatus}`,
              version: 1,
              tenantId: 'portal',
              branchId,
              occurredAt: new Date().toISOString(),
              source: 'api-gateway',
              correlationId: purchaseOrderId,
              payload: { purchaseOrderId, supplierId, notes },
            });
            break;
          }
        }
      }
    } catch (err) {
      console.error(`[api] Failed to update PO ${purchaseOrderId}:`, err.message);
    }

    res.status(200).json({ received: true, purchaseOrderId, newStatus });
  }
);

// ── Pipeline Status ────────────────────────────────────

/**
 * GET /api/v1/pipeline/status
 *
 * Returns status of the automation pipeline.
 * Used by the Admin Panel to show component health.
 */
export const pipelineStatus = onRequest(
  {
    region: 'us-central1',
    cors: true,
  },
  async (req, res) => {
    const components = [];

    // 1. RTDB check
    try {
      const db = getDatabase();
      const snap = await db.ref('.info/connected').once('value');
      components.push({ name: 'RTDB', status: snap.val() ? 'ok' : 'error', detail: snap.val() ? 'Conectado' : 'Desconectado' });
    } catch {
      components.push({ name: 'RTDB', status: 'error', detail: 'No accesible' });
    }

    // 2. n8n check
    try {
      const n8nUrl = await getN8nUrl();
      if (n8nUrl) {
        const base = new URL(n8nUrl).origin;
        const resp = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(5_000) });
        components.push({ name: 'n8n', status: resp.ok ? 'ok' : 'error', detail: resp.ok ? 'Responde' : `HTTP ${resp.status}` });
      } else {
        components.push({ name: 'n8n', status: 'unknown', detail: 'No configurado' });
      }
    } catch (err) {
      components.push({ name: 'n8n', status: 'error', detail: err.message });
    }

    // 3. Events check
    try {
      const db = getDatabase();
      const snap = await db.ref('events/portal/done').limitToLast(1).once('value');
      const lastEvent = snap.exists() ? Object.keys(snap.val())[0] : null;
      components.push({ name: 'Event Bus', status: 'ok', detail: lastEvent ? `Último: ${lastEvent.slice(0, 20)}` : 'Sin eventos' });
    } catch {
      components.push({ name: 'Event Bus', status: 'error', detail: 'No accesible' });
    }

    res.status(200).json({
      status: components.every(c => c.status === 'ok' || c.status === 'unknown') ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      components,
    });
  }
);

// ── Health Check ───────────────────────────────────────

/**
 * GET /api/v1/health
 */
export const health = onRequest(
  {
    region: 'us-central1',
    cors: true,
  },
  async (req, res) => {
    res.status(200).json({
      status: 'ok',
      version: '1.1.0',
      timestamp: new Date().toISOString(),
    });
  }
);
