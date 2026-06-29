/**
 * Quick Templates for Communication System
 *
 * Pre-defined message templates with embedded priority and channel targeting.
 * One-tap send bypasses compose input.
 */

/**
 * @typedef {Object} QuickTemplate
 * @property {string} id - Unique identifier
 * @property {string} label - Display label with emoji
 * @property {string} text - Message text to send
 * @property {'URGENT'|'NORMAL'|'INFO'} priority - Message priority
 * @property {string} channel - Target channel ID
 */

/**
 * Quick templates for common communication scenarios
 * @type {QuickTemplate[]}
 */
export const QUICK_TEMPLATES = [
  {
    id: 'driver-arrived',
    label: '🍺 Driver llegó',
    text: 'Driver de delivery llegó',
    priority: 'NORMAL',
    channel: 'cash',
  },
  {
    id: 'order-ready',
    label: '📦 Orden lista',
    text: 'Orden lista para retiro',
    priority: 'NORMAL',
    channel: 'general',
  },
  {
    id: 'payment-ok',
    label: '💰 Pago confirmado',
    text: 'Pago confirmado',
    priority: 'INFO',
    channel: 'general',
  },
  {
    id: 'low-stock',
    label: '⚠️ Stock bajo',
    text: 'Stock bajo en: ',
    priority: 'URGENT',
    channel: 'general',
  },
  {
    id: 'urgent',
    label: '🔴 URGENTE',
    text: 'URGENTE: ',
    priority: 'URGENT',
    channel: 'general',
  },
  {
    id: 'help',
    label: '🚨 Ayuda',
    text: 'Necesito ayuda en: ',
    priority: 'URGENT',
    channel: 'general',
  },
];

/**
 * Priority badge styles
 */
export const PRIORITY_STYLES = {
  URGENT: {
    bg: 'bg-cm-error',
    text: 'text-white',
  },
  NORMAL: {
    bg: 'bg-cm-warning',
    text: 'text-black',
  },
  INFO: {
    bg: 'bg-cm-info',
    text: 'text-white',
  },
};

export default QUICK_TEMPLATES;