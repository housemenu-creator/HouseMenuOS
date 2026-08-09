/**
 * @house/event-bus — Event Catalog
 *
 * Single source of truth for event types, schemas, and workflow routing.
 * Only Phase 1 events are implemented. Future events are documented but not enabled.
 *
 * @see AUTOMATION_ARCHITECTURE.md §5.2
 */

import { z } from 'zod';

// ── Phase 1: Purchase Order Automation ───────────────────

const stockLowPayload = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  currentStock: z.number().nonnegative(),
  minStock: z.number().positive(),
  supplierId: z.string().min(1),
});

const poCreatedPayload = z.object({
  purchaseOrderId: z.string().min(1),
  supplierId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(),
    unit: z.string(),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative(),
  })),
  total: z.number().nonnegative(),
});

const poConfirmedPayload = z.object({
  purchaseOrderId: z.string().min(1),
  supplierId: z.string().min(1),
  confirmedAt: z.string().datetime(),
});

const poReadyPayload = z.object({
  purchaseOrderId: z.string().min(1),
  supplierId: z.string().min(1),
  readyAt: z.string().datetime(),
});

const poDeliveredPayload = z.object({
  purchaseOrderId: z.string().min(1),
  receivedBy: z.string().min(1),
  deliveredAt: z.string().datetime(),
});

// ── Catalog definition ───────────────────────────────────

/**
 * @typedef {Object} EventCatalogEntry
 * @property {string} type - Event type identifier
 * @property {number} version - Current schema version
 * @property {string} description - Human-readable description
 * @property {string} phase - Implementation phase ("1" | "future")
 * @property {string|null} workflowId - n8n workflow to trigger (null = no automation)
 * @property {import('zod').ZodType} schema - Payload validation schema
 * @property {string[]} triggers - What triggers this event
 * @property {boolean} enabled - Feature flag
 */

/** @type {Object<string, EventCatalogEntry>} */
export const EVENT_CATALOG = {
  'inventory.stock.low': {
    type: 'inventory.stock.low',
    version: 1,
    description: 'Stock por debajo del mínimo configurado',
    phase: '1',
    workflowId: 'purchase-order-auto-v1',
    schema: stockLowPayload,
    triggers: ['InventoryService.updateStock()', 'Manual stock adjustment'],
    enabled: true,
  },
  'purchase_order.created': {
    type: 'purchase_order.created',
    version: 1,
    description: 'Orden de compra creada por n8n',
    phase: '1',
    workflowId: 'purchase-order-auto-v1',
    schema: poCreatedPayload,
    triggers: ['POST /api/v1/purchase-orders'],
    enabled: true,
  },
  'purchase_order.confirmed': {
    type: 'purchase_order.confirmed',
    version: 1,
    description: 'Proveedor confirma la orden de compra',
    phase: '1',
    workflowId: 'purchase-order-auto-v1',
    schema: poConfirmedPayload,
    triggers: ['POST /api/v1/webhooks/supplier'],
    enabled: true,
  },
  'purchase_order.ready': {
    type: 'purchase_order.ready',
    version: 1,
    description: 'Proveedor marca la orden como lista para recoger',
    phase: '1',
    workflowId: 'purchase-order-auto-v1',
    schema: poReadyPayload,
    triggers: ['POST /api/v1/webhooks/supplier'],
    enabled: true,
  },
  'purchase_order.delivered': {
    type: 'purchase_order.delivered',
    version: 1,
    description: 'Mercadería recibida en el restaurante',
    phase: '1',
    workflowId: 'purchase-order-auto-v1',
    schema: poDeliveredPayload,
    triggers: ['PATCH /api/v1/purchase-orders/:id/status → delivered'],
    enabled: true,
  },
};

// ── Future events (documented, NOT implemented) ──────────

/**
 * Future event types for reference. Not registered in EVENT_CATALOG.
 * These get added when a workflow needs them.
 *
 * sales:         sales.completed, sales.order.created, sales.order.cancelled
 * delivery:      delivery.requested, delivery.assigned, delivery.delivered
 * cash:          cash.session.opened, cash.session.closed, cash.payment.received
 * customers:     customer.created, customer.loyalty.updated
 * system:        system.workflow.completed, system.workflow.failed, system.error
 */

// ── Helpers ──────────────────────────────────────────────

/**
 * Get the workflow ID for an event type.
 * @param {string} eventType
 * @returns {string|null} workflowId or null if no workflow
 */
export function getWorkflowForEvent(eventType) {
  return EVENT_CATALOG[eventType]?.workflowId ?? null;
}

/**
 * Check if an event type is registered in the catalog.
 * @param {string} eventType
 * @returns {boolean}
 */
export function isValidEventType(eventType) {
  return eventType in EVENT_CATALOG;
}

/**
 * Get the schema for an event type's payload.
 * @param {string} eventType
 * @returns {import('zod').ZodType|undefined}
 */
export function getPayloadSchema(eventType) {
  return EVENT_CATALOG[eventType]?.schema;
}

/**
 * Get the version for an event type.
 * @param {string} eventType
 * @returns {number}
 */
export function getEventVersion(eventType) {
  return EVENT_CATALOG[eventType]?.version ?? 1;
}
