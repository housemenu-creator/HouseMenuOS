/**
 * Communication System Service — Firebase RTDB paths and core operations
 *
 * RTDB Structure (branch-scoped):
 * /branches/{branchId}/comm/{channel}/messages/{messageId}
 *   ├── text, priority, senderId, senderRole, senderName, timestamp
 *   ├── acknowledgedBy: { role: { userId, role, timestamp } }
 *   ├── reactions: { emoji: { userId: true } }
 *   └── readBy: { userId: true }
 *
 * /orderNotes/{orderId}       — real-time note sync (NOT branch-scoped)
 * /users/{userId}/commSettings — user preferences
 *
 * Channel IDs:
 *   general → #general (all staff)
 *   kitchen → #cocina (kitchen only)
 *   cash    → #caja-delivery (cashiers + delivery)
 *   admin   → #admin (managers only)
 */
import { ref, push, set, onValue, update, query, limitToLast } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { commPath } from '../lib/paths';

// ── Messages ─────────────────────────────────────────────────────

/**
 * Send a message to a comm channel.
 * @param {string} branchId
 * @param {string} channelId - 'general' | 'kitchen' | 'cash' | 'admin'
 * @param {Object} data - { text, priority, senderId, senderRole, senderName, ...extra }
 * @returns {Promise<{success: boolean, messageId: string|null}>}
 */
export async function sendMessage(branchId, channelId, { text, priority = 'NORMAL', senderId, senderRole, senderName, ...extraData }) {
  try {
    const messagesRef = ref(db, `${commPath(branchId, channelId)}/messages`);
    const newMsgRef = push(messagesRef);

    const message = {
      text,
      priority,
      senderId,
      senderRole,
      senderName,
      timestamp: new Date().toISOString(),
      acknowledgedBy: {},
      reactions: {},
      ...extraData,
    };

    await set(newMsgRef, message);
    return { success: true, messageId: newMsgRef.key };
  } catch (err) {
    console.warn('commService.sendMessage error:', err);
    return { success: false, messageId: null };
  }
}

/**
 * Subscribe to messages in a comm channel.
 * @param {string} branchId
 * @param {string} channelId
 * @param {(msg[]) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToChannel(branchId, channelId, callback) {
  try {
    const messagesRef = ref(db, `${commPath(branchId, channelId)}/messages`);
    const q = query(messagesRef, limitToLast(100));
    const unsub = onValue(
      q,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) { callback([]); return; }
        const messages = Object.entries(data)
          .map(([id, msg]) => ({ id, ...msg }))
          .sort((a, b) => {
            const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return ta - tb;
          });
        callback(messages);
      },
      (error) => {
        console.warn('commService.subscribeToChannel error:', error);
        callback([]);
      }
    );
    return unsub;
  } catch (err) {
    console.warn('commService.subscribeToChannel setup error:', err);
    return () => {};
  }
}

// ── Acknowledgment ───────────────────────────────────────────────

/**
 * Acknowledge a message (by role — all users of same role share ACK).
 */
export async function acknowledgeMessage(branchId, channelId, messageId, userId, role) {
  try {
    const ackRef = ref(db, `${commPath(branchId, channelId, messageId)}/acknowledgedBy/${role}`);
    await set(ackRef, { userId, role, timestamp: new Date().toISOString() });
    return { success: true };
  } catch (err) {
    console.warn('commService.acknowledgeMessage error:', err);
    return { success: false };
  }
}

// ── Reactions ────────────────────────────────────────────────────

export async function addReaction(branchId, channelId, messageId, emoji, userId) {
  try {
    const reactionRef = ref(db, `${commPath(branchId, channelId, messageId)}/reactions/${emoji}/${userId}`);
    await set(reactionRef, true);
    return { success: true };
  } catch (err) {
    console.warn('commService.addReaction error:', err);
    return { success: false };
  }
}

export async function removeReaction(branchId, channelId, messageId, emoji, userId) {
  try {
    const reactionRef = ref(db, `${commPath(branchId, channelId, messageId)}/reactions/${emoji}/${userId}`);
    await set(reactionRef, null);
    return { success: true };
  } catch (err) {
    console.warn('commService.removeReaction error:', err);
    return { success: false };
  }
}

// ── Read markers ─────────────────────────────────────────────────

export async function markMessageRead(branchId, channelId, messageId, userId) {
  try {
    const readRef = ref(db, `${commPath(branchId, channelId, messageId)}/readBy/${userId}`);
    await set(readRef, true);
    return { success: true };
  } catch (err) {
    console.warn('commService.markMessageRead error:', err);
    return { success: false };
  }
}

// ── User Settings (NOT branch-scoped) ────────────────────────────

function commUserSettingsPath(userId) {
  return `/users/${userId}/commSettings`;
}

export function subscribeToUserSettings(userId, callback) {
  try {
    const settingsRef = ref(db, commUserSettingsPath(userId));
    const unsub = onValue(settingsRef, (snapshot) => {
      callback(snapshot.val() || {});
    });
    return unsub;
  } catch (err) {
    console.warn('commService.subscribeToUserSettings error:', err);
    return () => {};
  }
}

export async function updateUserSettings(userId, settings) {
  try {
    const settingsRef = ref(db, commUserSettingsPath(userId));
    await update(settingsRef, settings);
    return { success: true };
  } catch (err) {
    console.warn('commService.updateUserSettings error:', err);
    return { success: false };
  }
}

// ── Order Notes (NOT branch-scoped, shared across KDS) ───────────

export function orderNotesPath() {
  return '/orderNotes';
}

export function orderNotePath(orderId) {
  return `/orderNotes/${orderId}`;
}

export function subscribeToOrderNote(orderId, callback) {
  try {
    const noteRef = ref(db, orderNotePath(orderId));
    const unsub = onValue(noteRef, (snapshot) => {
      callback(snapshot.val() || null);
    });
    return unsub;
  } catch (err) {
    console.warn('commService.subscribeToOrderNote error:', err);
    return () => {};
  }
}

export async function saveOrderNote(orderId, text, userId, userName) {
  try {
    const noteRef = ref(db, orderNotePath(orderId));
    await set(noteRef, {
      text,
      userId,
      userName,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err) {
    console.warn('commService.saveOrderNote error:', err);
    return { success: false };
  }
}

export async function deleteOrderNote(orderId) {
  try {
    const noteRef = ref(db, orderNotePath(orderId));
    await set(noteRef, null);
    return { success: true };
  } catch (err) {
    console.warn('commService.deleteOrderNote error:', err);
    return { success: false };
  }
}
