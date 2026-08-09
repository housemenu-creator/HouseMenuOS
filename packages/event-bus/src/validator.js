/**
 * @house/event-bus — Event Validator
 *
 * Validates event types and payloads against the catalog schemas.
 */

import { isValidEventType, getPayloadSchema } from './catalog.js';

/**
 * Validate an event type and payload against the catalog.
 * @param {string} eventType
 * @param {Object} payload
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateEvent(eventType, payload) {
  if (!isValidEventType(eventType)) {
    return {
      valid: false,
      error: `Tipo de evento desconocido: "${eventType}". Revisa el catálogo en src/catalog.js`,
    };
  }

  const schema = getPayloadSchema(eventType);
  if (!schema) return { valid: true, error: null };

  const result = schema.safeParse(payload);
  if (result.success) return { valid: true, error: null };

  const error = result.error.issues
    .map(i => `${i.path.join('.')}: ${i.message}`)
    .join('; ');

  return { valid: false, error };
}
