/**
 * useFCM — Register Firebase Cloud Messaging token for push notifications.
 *
 * Call once in any staff view (DispatchView, AdminView, RepartidorView).
 * Requests notification permission on first call, registers the FCM token
 * in RTDB, and listens for foreground messages.
 *
 * Foreground messages trigger a callback so the view can show a toast/banner.
 */
import { useEffect, useRef } from 'react';
import { requestNotificationPermission, registerFCMToken, onForegroundMessage } from '../lib/firebaseMessaging';

export function useFCM({ branchId, userId, onForegroundPayload = null }) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!branchId || !userId || registeredRef.current) return;
    registeredRef.current = true;

    let unsub = () => {};

    async function init() {
      const token = await requestNotificationPermission();
      if (token) {
        await registerFCMToken(branchId, userId, token);
      }
      // Listen for messages while app is in foreground
      unsub = onForegroundMessage((payload) => {
        if (onForegroundPayload) {
          onForegroundPayload(payload);
        }
      });
    }

    init();

    return () => {
      unsub();
    };
  }, [branchId, userId, onForegroundPayload]);
}
