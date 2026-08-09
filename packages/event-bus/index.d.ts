// ── Event Bus types ──────────────────────────────────────

export interface HouseEvent {
  id: string;
  type: string;
  version: number;
  tenantId: string;
  branchId: string;
  occurredAt: string;
  source: string;
  correlationId: string;
  payload: Record<string, unknown>;
  metadata?: {
    idempotencyKey?: string;
    userEmail?: string;
    userRole?: string;
  };
}

export interface EventContext {
  branchId: string;
  tenantId?: string;
  correlationId?: string;
  userEmail?: string;
  userRole?: string;
}

// ── Publisher ────────────────────────────────────────────

export function pub(
  eventType: string,
  payload: Record<string, unknown>,
  context: EventContext
): Promise<{ eventId: string; type: string }>;

export function resolveTenantId(branchId: string): Promise<string>;

// ── Validator ────────────────────────────────────────────

export function validateEvent(
  eventType: string,
  payload: Record<string, unknown>
): { valid: boolean; error: string | null };

// ── Catalog ──────────────────────────────────────────────

export interface EventCatalogEntry {
  type: string;
  version: number;
  description: string;
  phase: string;
  workflowId: string | null;
  triggers: string[];
  enabled: boolean;
}

export const EVENT_CATALOG: Record<string, EventCatalogEntry>;
export function getWorkflowForEvent(eventType: string): string | null;
export function isValidEventType(eventType: string): boolean;
export function getPayloadSchema(eventType: string): any;
export function getEventVersion(eventType: string): number;

// ── IDs ──────────────────────────────────────────────────

export function generateEventId(): string;
export function generateCorrelationId(): string;
