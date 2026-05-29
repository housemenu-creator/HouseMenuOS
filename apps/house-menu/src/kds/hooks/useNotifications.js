import { useState, useEffect, useCallback } from 'react';
import { requestNotificationPermission, registerFCMToken, onForegroundMessage } from '../../lib/firebaseMessaging';
import { useBranch } from '../../context/BranchContext';

export function useNotifications(stationName) {
  const { activeBranchId } = useBranch();
  const [token, setToken] = useState(null);
  const [foregroundMsg, setForegroundMsg] = useState(null);

  // On mount, request permission + register token
  useEffect(() => {
    if (!('Notification' in window)) return;

    let cancelled = false;

    async function init() {
      const fcmToken = await requestNotificationPermission();
      if (!fcmToken || cancelled) return;
      setToken(fcmToken);
      // Use stationName as userId so notifications can target specific stations
      if (activeBranchId && stationName) {
        await registerFCMToken(activeBranchId, `kds_${stationName}`, fcmToken);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [activeBranchId, stationName]);

  // Listen for foreground messages
  useEffect(() => {
    if (!stationName) return;
    const unsub = onForegroundMessage((payload) => {
      const data = payload.data || {};
      // Only show if notification is for this station (or all stations)
      if (data.station && data.station !== stationName && data.station !== 'all') return;
      setForegroundMsg(payload);
    });
    return unsub;
  }, [stationName]);

  const dismissForeground = useCallback(() => setForegroundMsg(null), []);

  return { token, foregroundMsg, dismissForeground };
}
