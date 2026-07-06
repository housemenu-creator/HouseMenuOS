/**
 * In-app notification service using Firebase RTDB.
 * Each user gets a notification node under their branch:
 *   branches/{branchId}/notifications/{userId}/{notifId}
 *
 * Events are written by the action that triggers them (assign driver, confirm delivery, etc.)
 * and read in real-time by each view's NotificationBell component.
 */
import { ref, push, set, update, query, limitToLast, onValue, serverTimestamp, orderByChild } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { checkPreference } from './notificationPreferences';

/**
 * Firebase RTDB no permite ".", "#", "$", "[", "]" en keys de paths.
 * Los emails contienen "." — los encodeamos a "," que sí es válido.
 */
function safePathKey(str) {
  return str.replace(/\./g, ',').replace(/#/g, '_').replace(/[$\[\]]/g, '_');
}

let notifCounter = 0;

/**
 * Create a notification for a specific user.
 * Returns the notification ID (for optimistic updates).
 */
export async function createNotification({ branchId, userId, type, title, body, orderId = null, url = null }) {
  if (!branchId || !userId) return null;

  const key = safePathKey(userId);
  const notifRef = ref(db, `branches/${branchId}/notifications/${key}`);
  const newRef = push(notifRef);
  const notifId = newRef.key;

  const notification = {
    type,
    title,
    body: body || '',
    orderId: orderId || '',
    url: url || '',
    read: false,
    createdAt: serverTimestamp(),
    _createdAt_client: Date.now(), // fallback for display before serverTimestamp resolves
  };

  await set(newRef, notification);
  return notifId;
}

/**
 * Create a notification for MULTIPLE users at once (e.g., all dispatchers).
 */
export async function createNotificationForUsers({ branchId, userIds, type, title, body, orderId = null, url = null }) {
  if (!branchId || !userIds?.length) return;
  await Promise.all(
    userIds.map((uid) =>
      createNotification({ branchId, userId: uid, type, title, body, orderId, url })
    )
  );
}

/**
 * Create a notification ONLY if the user has this type enabled in preferences.
 * Returns the notification ID, or null if the user opted out.
 */
export async function createFilteredNotification({ branchId, userId, type, title, body, orderId = null, url = null }) {
  if (!branchId || !userId) return null;

  const pref = await checkPreference(branchId, userId, type);
  if (!pref.allowed) {
    return null; // User has this type disabled
  }

  return createNotification({ branchId, userId, type, title, body, orderId, url });
}

/**
 * Create notifications for MULTIPLE users, respecting each user's preferences.
 * Only users who have the notification type enabled will receive it.
 */
export async function createFilteredNotificationForUsers({ branchId, userIds, type, title, body, orderId = null, url = null }) {
  if (!branchId || !userIds?.length) return;

  // Check all preferences in parallel, then write only for allowed users
  const checks = await Promise.all(
    userIds.map(async (uid) => {
      const pref = await checkPreference(branchId, uid, type);
      return { userId: uid, allowed: pref.allowed };
    })
  );

  const allowedUserIds = checks.filter((c) => c.allowed).map((c) => c.userId);
  if (allowedUserIds.length === 0) return;

  await Promise.all(
    allowedUserIds.map((uid) =>
      createNotification({ branchId, userId: uid, type, title, body, orderId, url })
    )
  );
}

/**
 * Subscribe to notifications for a user (most recent 50).
 * Returns unsubscribe function.
 */
export function subscribeToNotifications(branchId, userId, onData) {
  if (!branchId || !userId) return () => {};

  const key = safePathKey(userId);
  const notifRef = query(
    ref(db, `branches/${branchId}/notifications/${key}`),
    orderByChild('createdAt'),
    limitToLast(50)
  );

  const unsub = onValue(notifRef, (snap) => {
    const data = snap.val();
    if (!data) {
      onData([]);
      return;
    }
    const list = Object.entries(data)
      .map(([id, val]) => ({ id, ...val }))
      .reverse(); // newest first
    onData(list);
  });

  return unsub;
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(branchId, userId, notifId, trackClick = false) {
  if (!branchId || !userId || !notifId) return;
  const key = safePathKey(userId);
  const updates = {
    read: true,
  };
  // Track cuando el usuario hace clic activamente en la notificación
  if (trackClick) {
    updates.clickedAt = serverTimestamp();
    updates._clickedAt_client = Date.now();
  }
  await update(ref(db, `branches/${branchId}/notifications/${key}/${notifId}`), updates);
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(branchId, userId, notifIds) {
  if (!branchId || !userId || !notifIds?.length) return;
  const key = safePathKey(userId);
  const updates = {};
  for (const id of notifIds) {
    updates[`branches/${branchId}/notifications/${key}/${id}/read`] = true;
  }
  await update(ref(db), updates);
}

/**
 * Get the count of unread notifications (from a list).
 */
export function getUnreadCount(notifications) {
  if (!notifications?.length) return 0;
  return notifications.filter((n) => !n.read).length;
}

/**
 * Notification type → icon mapping.
 */
export const NOTIF_ICONS = {
  order_new:     '📦',
  order_assigned: '🚴',
  order_delivered: '✅',
  order_cancelled: '❌',
  delivery_confirmed: '🎉',
  driver_offline: '⚠️',
  system:        '🔔',
  comm_message:  '💬',
};

export const NOTIF_TYPES = [
  'order_new',
  'order_assigned',
  'order_delivered',
  'order_cancelled',
  'delivery_confirmed',
  'driver_offline',
  'system',
  'comm_message',
];
