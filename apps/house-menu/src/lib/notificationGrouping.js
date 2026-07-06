/**
 * Notification grouping utility — stacks consecutive notifications of the same type
 * within a configurable time window for cleaner display.
 *
 * A "group" contains:
 *   - type: the notification type (order_new, comm_message, etc.)
 *   - items: the individual notifications in the group
 *   - count: how many items
 *   - latest: the most recent notification (for title/body display)
 *   - allRead: true if every item is read
 *   - timeLabel: human-readable time for the group
 *
 * The time window defaults to 2 minutes — any notifications of the same
 * type within 2 minutes of each other get stacked.
 */

const DEFAULT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Group a flat list of notifications into stacked groups.
 *
 * @param {Array} notifications - Flat list [{ id, type, title, body, _createdAt_client, createdAt, read, ... }]
 * @param {number} windowMs - Time window in ms for stacking (default 2 min)
 * @returns {Array} [{ type, count, items, latest, allRead, timeLabel }]
 */
export function groupNotifications(notifications, windowMs = DEFAULT_WINDOW_MS) {
  if (!notifications?.length) return [];

  const groups = [];

  for (const notif of notifications) {
    const ts = notif._createdAt_client || notif.createdAt || 0;

    // Try to add to existing group
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.type === notif.type) {
      const lastTs = lastGroup.latest._createdAt_client || lastGroup.latest.createdAt || 0;
      if (Math.abs(ts - lastTs) <= windowMs) {
        lastGroup.items.push(notif);
        lastGroup.count = lastGroup.items.length;
        // Keep latest as the most recent by timestamp
        if (ts > (lastGroup.latest._createdAt_client || lastGroup.latest.createdAt || 0)) {
          lastGroup.latest = notif;
        }
        lastGroup.allRead = lastGroup.items.every((n) => n.read);
        lastGroup.timeLabel = timeAgo(lastGroup.latest._createdAt_client || lastGroup.latest.createdAt);
        continue;
      }
    }

    // New group
    groups.push({
      type: notif.type,
      items: [notif],
      count: 1,
      latest: notif,
      allRead: !notif.read,
      timeLabel: timeAgo(ts),
    });
  }

  return groups;
}

function timeAgo(dateVal) {
  if (!dateVal) return '';
  const ts = typeof dateVal === 'number' ? dateVal : new Date(dateVal).getTime();
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

/**
 * Get a display title for a grouped notification.
 * Examples:
 *   - "Nuevo pedido" (1 item)
 *   - "3 nuevos pedidos" (3+ items)
 *   - "💬 Juan Pérez" (comm_message with sender name)
 */
export function getGroupTitle(group) {
  const { type, count, latest } = group;
  const title = latest.title || '';

  if (count === 1) return title;

  // Pluralize based on type
  const pluralized = GROUP_PLURALS[type];
  if (pluralized) {
    return `${count} ${pluralized}`;
  }

  return `${count} × ${title}`;
}

const GROUP_PLURALS = {
  order_new: 'nuevos pedidos',
  order_assigned: 'asignaciones',
  order_delivered: 'entregas',
  order_cancelled: 'cancelaciones',
  delivery_confirmed: 'confirmaciones',
  driver_offline: 'repartidores offline',
  system: 'avisos del sistema',
  comm_message: 'mensajes nuevos',
};
