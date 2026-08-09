/**
 * @house/event-bus — Event Bus for House Portal OS
 *
 * Central event system for the automation architecture.
 * Provides event publishing, catalog validation, and dispatching.
 *
 * @see docs/AUTOMATION_ARCHITECTURE.md
 */

export { pub, resolveTenantId } from './src/publisher.js';
export { validateEvent } from './src/validator.js';
export {
  EVENT_CATALOG,
  getWorkflowForEvent,
  isValidEventType,
  getPayloadSchema,
  getEventVersion,
} from './src/catalog.js';
export {
  generateEventId,
  generateCorrelationId,
  HouseEventSchema,
} from './src/types.js';
