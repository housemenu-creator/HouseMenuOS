import { ref, push, set, onValue, query, limitToLast, update } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { chatPath, chatReadByPath, CHAT_CHANNELS } from './paths';

export async function sendMessage(branchId, channel = CHAT_CHANNELS.GENERAL, { text, sender, senderName }) {
  try {
    const msgRef = push(ref(db, chatPath(branchId, channel)));
    await set(msgRef, {
      text,
      sender,
      senderName,
      channel,
      timestamp: new Date().toISOString(),
      readBy: { [sender]: true },
    });
    return { success: true };
  } catch (err) {
    console.warn('chatService.sendMessage error:', err);
    return { success: false };
  }
}

export function subscribeMessages(branchId, channel = CHAT_CHANNELS.GENERAL, callback) {
  try {
    const messagesRef = ref(db, chatPath(branchId, channel));
    const q = query(messagesRef, limitToLast(50));
    const unsub = onValue(q, (snapshot) => {
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
    }, (error) => {
      console.warn('chatService.subscribeMessages error:', error);
      callback([]);
    });
    return unsub;
  } catch (err) {
    console.warn('chatService.subscribeMessages setup error:', err);
    return () => {};
  }
}

export async function markMessageRead(branchId, channel, messageId, userId) {
  try {
    const msgRef = ref(db, chatReadByPath(branchId, channel, messageId, userId));
    await set(msgRef, true);
    return { success: true };
  } catch (err) {
    console.warn('chatService.markMessageRead error:', err);
    return { success: false };
  }
}
