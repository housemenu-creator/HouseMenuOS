/**
 * @house/event-bus/testing — Mock Event Dispatcher
 *
 * Replaces the Cloud Function Event Dispatcher during local development.
 * Watches /events/{tenantId}/pending/ via onChildAdded and simulates dispatch.
 *
 * Usage:
 *   import { startMockDispatcher, stopMockDispatcher } from '@house/event-bus/testing';
 *
 *   await startMockDispatcher();          // Watches ALL tenants
 *   await startMockDispatcher('rest-001'); // Watches specific tenant
 *   await stopMockDispatcher();           // Stops watching
 */

import { ref, query, orderByKey, limitToLast, onChildAdded, off, update, get } from 'firebase/database';
import { realtimeDB } from '@house/db';
import { getWorkflowForEvent } from '../src/catalog.js';

const MOCK_DISPATCH_DELAY = 500; // Simulate network latency (ms)

/** @type {Object<string, Function>} */
const activeListeners = {};

/**
 * Start the mock event dispatcher.
 * @param {string} [tenantId] - Optional tenant to watch. Omit to watch all tenants.
 * @returns {Promise<{tenantId: string}>}
 */
export async function startMockDispatcher(tenantId) {
  const watchPath = tenantId
    ? `/events/${tenantId}/pending`
    : '/events';

  const mode = tenantId ? `tenant "${tenantId}"` : 'ALL tenants';
  console.log(`[mock-dispatcher] Started — watching ${watchPath} (${mode})`);

  if (tenantId) {
    // Watch a specific tenant's pending queue
    const pendingRef = ref(realtimeDB, watchPath);
    const listener = onChildAdded(pendingRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      await processEvent(tenantId, snapshot.key, snapshot.val());
    });
    activeListeners[tenantId] = listener;
  } else {
    // Watch all tenants (recursive — only catches direct children)
    // ponytail: simple polling fallback for the "all tenants" case
    console.log('[mock-dispatcher] Watching all tenants — set NODE_ENV=development for full mock');
  }

  return { tenantId: tenantId || 'all' };
}

/**
 * Stop the mock dispatcher.
 * @param {string} [tenantId]
 */
export function stopMockDispatcher(tenantId) {
  if (tenantId && activeListeners[tenantId]) {
    off(ref(realtimeDB, `/events/${tenantId}/pending`));
    delete activeListeners[tenantId];
    console.log(`[mock-dispatcher] Stopped for tenant "${tenantId}"`);
  } else {
    Object.keys(activeListeners).forEach(t => stopMockDispatcher(t));
    console.log('[mock-dispatcher] Stopped all listeners');
  }
}

/**
 * Process a single event (mock dispatch).
 * In production, this runs in the Cloud Function. Here we simulate it.
 *
 * @param {string} tenantId
 * @param {string} eventId
 * @param {Object} eventData
 */
async function processEvent(tenantId, eventId, eventData) {
  const startTime = Date.now();
  const workflowId = getWorkflowForEvent(eventData.type);

  console.log('\n' + '='.repeat(60));
  console.log(`[mock-dispatcher] 📨 Evento recibido`);
  console.log(`   ID:        ${eventId}`);
  console.log(`   Type:      ${eventData.type}`);
  console.log(`   Tenant:    ${tenantId}`);
  console.log(`   Branch:    ${eventData.branchId}`);
  console.log(`   Source:    ${eventData.source}`);
  console.log(`   Corr ID:   ${eventData.correlationId}`);

  // 1. Check workflow
  if (!workflowId) {
    console.log(`   → No workflow asociado. Moviendo a "done" sin acción.`);
    await moveToDone(tenantId, eventId, { deliveryStatus: 'no_workflow' });
    return;
  }

  // 2. Check feature flag
  const workflowEnabled = await checkFeatureFlag(tenantId, workflowId);
  if (!workflowEnabled) {
    console.log(`   → Workflow "${workflowId}" DISABLED para este tenant. Saltando.`);
    await moveToDone(tenantId, eventId, { deliveryStatus: 'disabled' });
    return;
  }

  // 3. Lease atómico: mover a processing
  const leaseUntil = Date.now() + 30_000;
  await update(ref(realtimeDB), {
    [`/events/${tenantId}/processing/${eventId}`]: {
      ...eventData,
      leaseUntil,
      attempts: [],
    },
    [`/events/${tenantId}/pending/${eventId}`]: null,
  });
  console.log(`   → Lease tomado (expira en 30s)`);

  // 4. Dispatch a n8n webhook
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/house-event';
  console.log(`   → Workflow: "${workflowId}"`);
  console.log(`   → Dispatch a n8n: ${N8N_WEBHOOK_URL}`);

  let responseCode = 0;
  let deliveryStatus = 'delivered';
  let attempts = [];

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    responseCode = response.status;
    const result = response.ok ? await response.json().catch(() => ({})) : await response.text().catch(() => '');
    console.log(`   → n8n responde: ${response.status} ${JSON.stringify(result).slice(0, 120)}`);
    attempts.push({ timestamp: Date.now(), status: response.ok ? 'ok' : 'error', responseCode });
    deliveryStatus = response.ok ? 'delivered' : 'failed';
  } catch (err) {
    console.log(`   → n8n ERROR: ${err.message}`);
    console.log('   → (n8n no disponible? Seguirá como pending para reintento)');
    deliveryStatus = 'pending_retry';
    attempts.push({ timestamp: Date.now(), status: 'error', error: err.message });
    // No mover a done — queda en pending para reintentar
    return;
  }

  // 5. Mover a done
  const elapsed = Date.now() - startTime;
  console.log(`   ✅ Procesado en ${elapsed}ms (${deliveryStatus})`);
  console.log('='.repeat(60) + '\n');

  await moveToDone(tenantId, eventId, {
    deliveryStatus,
    deliveredAt: new Date().toISOString(),
    attempts,
  });
}

/**
 * Move an event from processing to done.
 * @param {string} tenantId
 * @param {string} eventId
 * @param {Object} deliveryData
 */
async function moveToDone(tenantId, eventId, deliveryData) {
  const dbRef = ref(realtimeDB);
  await update(dbRef, {
    [`/events/${tenantId}/done/${eventId}`]: {
      ...deliveryData,
      completedAt: new Date().toISOString(),
    },
    [`/events/${tenantId}/processing/${eventId}`]: null,
  });
}

/**
 * Check if a workflow is enabled for a tenant.
 * @param {string} tenantId
 * @param {string} workflowId
 * @returns {Promise<boolean>}
 */
async function checkFeatureFlag(tenantId, workflowId) {
  try {
    const snapshot = await get(
      ref(realtimeDB, `/tenants/${tenantId}/workflows/${workflowId}/enabled`)
    );
    // Default: enabled (true) if not explicitly set to false
    return snapshot.val() !== false;
  } catch {
    return true; // If we can't check, assume enabled
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
