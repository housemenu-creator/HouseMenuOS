/**
 * @house/event-bus — Event Publisher
 *
 * Central API for publishing events. Every service in the SaaS uses this
 * to emit events. Events are persisted to RTDB under /events/{tenantId}/pending/.
 *
 * Usage:
 *   import { pub } from '@house/event-bus';
 *   await pub('inventory.stock.low', { productId, ... }, { branchId: 'monteverde' });
 */

import { ref, push, set } from 'firebase/database';
import { realtimeDB } from '@house/db';
import { generateEventId, generateCorrelationId } from './types.js';
import { validateEvent } from './validator.js';
import { getWorkflowForEvent, getEventVersion } from './catalog.js';

/**
 * Publish an event to the event bus.
 *
 * @param {string} eventType - Type from event catalog (e.g. 'inventory.stock.low')
 * @param {Object} payload - Event-specific data (validated against catalog schema)
 * @param {Object} context - Publishing context
 * @param {string} context.branchId - Branch where the event occurred (required)
 * @param {string} [context.tenantId] - Tenant (auto-derived from branch if omitted)
 * @param {string} [context.correlationId] - For chaining events in a flow
 * @param {string} [context.userEmail] - Who triggered the event
 * @param {string} [context.userRole] - Role of the user
 * @returns {Promise<{eventId: string, type: string}>}
 * @throws {Error} If event type is invalid or payload doesn't match schema
 */
export async function pub(eventType, payload, context) {
  // 1. Validate event type + payload against catalog
  const validation = validateEvent(eventType, payload);
  if (!validation.valid) {
    throw new Error(`[event-bus] Error publicando "${eventType}": ${validation.error}`);
  }

  // 2. Derive tenantId from branch if not provided
  //    (future: lookup /branches/{branchId}/tenantId if needed)
  const tenantId = context.tenantId || context.branchId;

  // 3. Build the event
  const eventId = generateEventId();
  const now = new Date().toISOString();

  /** @type {import('./types.js').HouseEvent} */
  const event = {
    id: eventId,
    type: eventType,
    version: getEventVersion(eventType),
    tenantId,
    branchId: context.branchId,
    occurredAt: now,
    source: 'unknown', // caller should override via context if possible
    correlationId: context.correlationId || generateCorrelationId(),
    payload,
    metadata: {
      idempotencyKey: eventId, // eventId doubles as idempotency key
      userEmail: context.userEmail,
      userRole: context.userRole,
    },
  };

  // 4. Persist to RTDB
  const eventRef = ref(realtimeDB, `/events/${tenantId}/pending/${eventId}`);
  await set(eventRef, event);

  // 5. Log (lightweight — production should use structured logging)
  const workflowId = getWorkflowForEvent(eventType);
  if (workflowId) {
    console.log(`[event-bus] Published "${eventType}" (${eventId}) → workflow "${workflowId}"`);
  } else {
    console.log(`[event-bus] Published "${eventType}" (${eventId}) — sin workflow asociado`);
  }

  return { eventId, type: eventType };
}

/**
 * Resolve a branch ID to a tenant ID.
 * Currently a simple 1:1 mapping; in multi-tenant setups this would
 * look up /branches/{branchId}/tenantId in RTDB.
 *
 * @param {string} branchId
 * @returns {Promise<string>}
 */
export async function resolveTenantId(branchId) {
  // ponytail: single-tenant for now, branchId = tenantId
  // When multi-tenant is needed, read from RTDB:
  //   const snap = await get(child(ref(realtimeDB), `branches/${branchId}/tenantId`));
  //   return snap.val() || branchId;
  return branchId;
}
