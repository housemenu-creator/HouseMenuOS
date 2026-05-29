import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { ref, set, onDisconnect } from 'firebase/database';
import { app } from '@house/db';
import { realtimeDB as db } from '@house/db';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn('Firebase Messaging not available:', e.message);
}

export async function requestNotificationPermission() {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

export async function registerFCMToken(branchId, userId, token) {
  if (!branchId || !userId || !token) return;
  const tokenRef = ref(db, `branches/${branchId}/fcm_tokens/${userId}`);
  await set(tokenRef, {
    token,
    platform: 'web',
    updatedAt: new Date().toISOString(),
  });
  onDisconnect(tokenRef).remove();
}

export async function unregisterFCMToken(branchId, userId) {
  if (!branchId || !userId) return;
  const tokenRef = ref(db, `branches/${branchId}/fcm_tokens/${userId}`);
  await set(tokenRef, null);
}

export function onForegroundMessage(callback) {
  if (!messaging) return () => {};
  const unsubscribe = onMessage(messaging, (payload) => {
    callback(payload);
  });
  return unsubscribe;
}
