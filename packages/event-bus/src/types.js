/**
 * @house/event-bus — Type definitions
 *
 * Core event types for the House Portal OS event bus.
 * Uses JSDoc types (consistent with @house/db pattern) + Zod schemas for runtime validation.
 */

import { z } from 'zod';

// ── Helpers ──────────────────────────────────────────────

/** Generate a timestamped event ID (sortable, unique, no deps) */
export function generateEventId() {
  const ts = Date.now().toString(36);
  const rand = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(rand, b => b.toString(16).padStart(2, '0')).join('');
  return `evt_${ts}_${hex.slice(0, 8)}`;
}

/** Generate a correlation ID for tracing multi-event flows */
export function generateCorrelationId() {
  const ts = Date.now().toString(36);
  const rand = crypto.getRandomValues(new Uint8Array(4));
  const hex = Array.from(rand, b => b.toString(16).padStart(2, '0')).join('');
  return `corr_${ts}_${hex}`;
}

// ── Runtime schemas (Zod) ────────────────────────────────

/** Metadata that any event can carry */
const EventMetadataSchema = z.object({
  idempotencyKey: z.string().optional(),
  userEmail: z.string().optional(),
  userRole: z.string().optional(),
}).optional();

/** Core event schema — validates the shape of every event */
export const HouseEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  version: z.number().int().positive().default(1),
  tenantId: z.string().min(1),
  branchId: z.string().min(1),
  occurredAt: z.string().datetime(),
  source: z.string().min(1),
  correlationId: z.string(),
  payload: z.record(z.unknown()),
  metadata: EventMetadataSchema,
});

/** Context required when publishing an event */
export const EventContextSchema = z.object({
  branchId: z.string().min(1, 'branchId es requerido'),
  tenantId: z.string().optional(),
  correlationId: z.string().optional(),
  userEmail: z.string().optional(),
  userRole: z.string().optional(),
});

// ── JSDoc types for editor support ───────────────────────

/**
 * @typedef {Object} HouseEvent
 * @property {string} id - UUID v7-like (timestamped)
 * @property {string} type - Event type from catalog
 * @property {number} version - Schema version
 * @property {string} tenantId - Multi-tenant identifier
 * @property {string} branchId - Branch/sucursal
 * @property {string} occurredAt - ISO 8601
 * @property {string} source - Service name
 * @property {string} correlationId - Trace ID
 * @property {Object} payload - Event-specific data
 * @property {Object} [metadata] - Optional metadata
 * @property {string} [metadata.idempotencyKey]
 * @property {string} [metadata.userEmail]
 * @property {string} [metadata.userRole]
 */

/**
 * @typedef {Object} EventContext
 * @property {string} branchId
 * @property {string} [tenantId]
 * @property {string} [correlationId]
 * @property {string} [userEmail]
 * @property {string} [userRole]
 */

/**
 * @typedef {'inventory.stock.low'|'purchase_order.created'|'purchase_order.confirmed'|'purchase_order.ready'|'purchase_order.delivered'} EventTypePhase1
 */

/**
 * @typedef {'pending'|'processing'|'done'} EventDeliveryStatus
 */

/**
 * @typedef {Object} EventDeliveryState
 * @property {EventDeliveryStatus} status
 * @property {Array<{timestamp: number, status: string, responseCode?: number, error?: string}>} [attempts]
 * @property {number} [leaseUntil]
 * @property {string} [deliveredAt]
 * @property {string} [error]
 */
