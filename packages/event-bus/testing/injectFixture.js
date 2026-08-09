/**
 * @house/event-bus/testing — Inject Fixture
 *
 * Injects a fixture event directly into RTDB for testing.
 * Useful for integration tests and manual QA.
 *
 * Usage:
 *   import { injectFixture } from '@house/event-bus/testing';
 *   await injectFixture('stock-low', { branchId: 'test-branch' });
 */

import { ref, set } from 'firebase/database';
import { realtimeDB } from '@house/db';
import { pub } from '../src/publisher.js';

const FIXTURES = {
  'stock-low':     () => import('../__fixtures__/stock-low.json', { with: { type: 'json' } }),
  'po-created':    () => import('../__fixtures__/po-created.json', { with: { type: 'json' } }),
  'po-confirmed':  () => import('../__fixtures__/po-confirmed.json', { with: { type: 'json' } }),
  'po-ready':      () => import('../__fixtures__/po-ready.json', { with: { type: 'json' } }),
  'po-delivered':  () => import('../__fixtures__/po-delivered.json', { with: { type: 'json' } }),
};

/** @type {Record<string, string>} */
const FIXTURE_ALIASES = {
  'stock': 'stock-low',
  'po': 'po-created',
  'confirm': 'po-confirmed',
  'ready': 'po-ready',
  'deliver': 'po-delivered',
};

/**
 * Inject a fixture event into RTDB via pub().
 *
 * @param {string} name - Fixture name (or alias like 'stock', 'po', 'confirm')
 * @param {Object} [overrides] - Override context fields (branchId, tenantId, etc.)
 * @returns {Promise<{eventId: string, type: string}>}
 */
export async function injectFixture(name, overrides = {}) {
  const resolvedName = FIXTURE_ALIASES[name] || name;
  const loader = FIXTURES[resolvedName];

  if (!loader) {
    const available = Object.keys(FIXTURES).join(', ');
    throw new Error(
      `Fixture "${name}" no encontrada. Disponibles: ${available}. ` +
      `Aliases: ${Object.entries(FIXTURE_ALIASES).map(([k, v]) => `${k}→${v}`).join(', ')}`
    );
  }

  const { default: fixture } = await loader();
  const context = { ...fixture.context, ...overrides };

  const result = await pub(fixture.eventType, fixture.payload, context);
  console.log(`[fixtures] Inyectado "${resolvedName}" → ${result.eventId}`);
  return result;
}

/**
 * Inject all Phase 1 fixtures in order (simulates a full PO flow).
 * Useful for smoke testing the entire pipeline.
 *
 * @param {Object} [overrides]
 * @returns {Promise<string[]>} Array of event IDs in order
 */
export async function injectFullFlow(overrides = {}) {
  const ids = [];

  ids.push((await injectFixture('stock-low', overrides)).eventId);
  ids.push((await injectFixture('po-created', overrides)).eventId);
  ids.push((await injectFixture('po-confirmed', overrides)).eventId);
  ids.push((await injectFixture('po-ready', overrides)).eventId);
  ids.push((await injectFixture('po-delivered', overrides)).eventId);

  console.log(`[fixtures] Flujo completo inyectado: ${ids.length} eventos`);
  return ids;
}

/**
 * List all available fixture names.
 * @returns {string[]}
 */
export function listFixtures() {
  return Object.keys(FIXTURES);
}
