/**
 * Event Dispatcher — Cloud Function v2
 *
 * Triggered by onCreate in /events/{tenantId}/pending/{eventId}.
 * Processes events with atomic lease, checks feature flags, dispatches to n8n.
 *
 * Deploy:
 *   firebase deploy --only functions:eventDispatcher
 *
 * @see docs/AUTOMATION_ARCHITECTURE.md §Anexo B
 */

import { onValueWritten } from 'firebase-functions/v2/database';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { createHmac } from 'node:crypto';

initializeApp();

const N8N_API_KEY = process.env.N8N_API_KEY || 'dev';
const HOUSE_WEBHOOK_SECRET = process.env.HOUSE_WEBHOOK_SECRET || 'dev';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [5_000, 30_000, 300_000]; // 5s, 30s, 5min

// ponytail: single workflow for Phase 1. Extend as needed.
const EVENT_WORKFLOW_MAP = {
  'inventory.stock.low':       'purchase-order-auto-v1',
  'purchase_order.created':    'purchase-order-auto-v1',
  'purchase_order.confirmed':  'purchase-order-auto-v1',
  'purchase_order.ready':      'purchase-order-auto-v1',
  'purchase_order.delivered':  'purchase-order-auto-v1',
};

/**
 * Get n8n webhook URL — reads from RTDB /config/n8n/webhookUrl first,
 * falls back to N8N_WEBHOOK_URL env var at deploy time.
 * Allows watchdog to update URL without redeploying.
 */
async function getWebhookUrl() {
  try {
    const db = getDatabase();
    const snap = await db.ref('tenants/portal/config/n8n/webhookUrl').once('value');
    const url = snap.val();
    if (typeof url === 'string' && url.startsWith('http')) return url;
  } catch {}
  return process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/house-event';
}

export const dispatchEvent = onValueWritten(
  {
    ref: '/events/{tenantId}/pending/{eventId}',
    region: 'us-central1',
  },
  async (event) => {
    const { tenantId, eventId } = event.params;

    // Only process CREATIONS, not updates
    if (event.data.after.exists() && event.data.before.exists()) return;

    const houseEvent = event.data.after.val();
    if (!houseEvent) return;

    const workflowId = EVENT_WORKFLOW_MAP[houseEvent.type];

    // 1. No workflow? Move to done immediately
    if (!workflowId) {
      await moveToDone(tenantId, eventId, { deliveryStatus: 'no_workflow' });
      return;
    }

    // 2. Check feature flag
    const enabled = await checkWorkflowEnabled(tenantId, workflowId);
    if (!enabled) {
      await moveToDone(tenantId, eventId, { deliveryStatus: 'disabled' });
      return;
    }

    // 3. Atomic lease: move pending → processing
    const leaseUntil = Date.now() + 30_000;
    const db = getDatabase();
    await db.ref('/').update({
      [`events/${tenantId}/processing/${eventId}`]: {
        ...houseEvent,
        leaseUntil,
        attempts: [],
      },
      [`events/${tenantId}/pending/${eventId}`]: null,
    });

    // 4. Dispatch to API Gateway with retries
    // ponytail: flat body (no { body: ... } wrapper) — API Gateway unwraps for n8n
    const dispatchBody = { ...houseEvent, eventId };
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const webhookUrl = await getWebhookUrl();
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${N8N_API_KEY}`,
            'X-House-Signature': generateSignature(dispatchBody),
            'X-House-Tenant': tenantId,
            'Idempotency-Key': eventId,
          },
          body: JSON.stringify(dispatchBody),
        });

        if (response.ok) {
          await moveToDone(tenantId, eventId, {
            deliveryStatus: 'delivered',
            deliveredAt: new Date().toISOString(),
            attempts: [{ timestamp: Date.now(), status: 'ok', responseCode: response.status }],
          });
          return;
        }

        // 4xx = permanent failure (bad request, auth error, etc.)
        if (response.status >= 400 && response.status < 500) {
          console.error(`[dispatcher] n8n returned ${response.status} for event ${eventId}:`, await response.text());
          await moveToDone(tenantId, eventId, {
            deliveryStatus: 'failed',
            error: `n8n returned ${response.status}`,
          });
          return;
        }

        // 5xx = temporary, retry
        console.warn(`[dispatcher] n8n returned ${response.status} (attempt ${attempt + 1})`);

      } catch (err) {
        console.error(`[dispatcher] Attempt ${attempt + 1} for event ${eventId}:`, err.message);
      }

      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    }

    // All retries exhausted
    await moveToDone(tenantId, eventId, {
      deliveryStatus: 'failed',
      error: 'max retries exceeded',
      lastAttempt: Date.now(),
    });
  }
);

/**
 * Move event to /done/ and clean up /processing/.
 */
async function moveToDone(tenantId, eventId, data) {
  const db = getDatabase();
  await db.ref('/').update({
    [`events/${tenantId}/done/${eventId}`]: {
      ...data,
      completedAt: new Date().toISOString(),
    },
    [`events/${tenantId}/processing/${eventId}`]: null,
  });
}

/**
 * Check feature flag for a workflow.
 */
async function checkWorkflowEnabled(tenantId, workflowId) {
  try {
    const db = getDatabase();
    const snap = await db.ref(`tenants/${tenantId}/workflows/${workflowId}/enabled`).once('value');
    return snap.val() !== false;
  } catch {
    return true;
  }
}

/**
 * Generate HMAC signature for outgoing requests.
 */
function generateSignature(event) {
  const payload = JSON.stringify(event);
  const hmac = createHmac('sha256', HOUSE_WEBHOOK_SECRET);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
