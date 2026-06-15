import { useEffect, useState, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import useDeliverySessionStore from '../store/deliverySessionStore';

export function useDriverIdentity(branchId: string, userId: string) {
  const [loading, setLoading] = useState(true);
  const setDriver = useDeliverySessionStore((s) => s.setDriver);
  const driverId = useDeliverySessionStore((s) => s.driverId);
  const driverName = useDeliverySessionStore((s) => s.driverName);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!branchId || !userId) {
      setLoading(false);
      return;
    }

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    setLoading(true);

    // Safety timeout: si Firebase security rules bloquean, no quedarse en loading forever
    const timeout = setTimeout(() => setLoading(false), 10000);

    const driversRef = ref(db, `branches/${branchId}/delivery/drivers`);
    const unsub = onValue(driversRef, (snap) => {
      clearTimeout(timeout);
      const data = snap.val();
      if (!data) { setLoading(false); return; }
      for (const [id, d] of Object.entries<Record<string, any>>(data)) {
        if (d.userId === userId || d.email === userId) {
          setDriver(id, d.name || '');
          setLoading(false);
          return;
        }
      }
      setLoading(false);
    });

    unsubRef.current = unsub;
    return () => {
      clearTimeout(timeout);
      unsub();
      useDeliverySessionStore.getState().reset();
    };
  }, [branchId, userId, setDriver]);

  return { driverId, driverName, loading };
}
