import { useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import useDeliveryStore from '../store/deliveryStore';
import type { DeliveryDriver } from '../../worker/workerTypes';

export function useDrivers(branchId: string) {
  const setDrivers = useDeliveryStore((s) => s.setDrivers);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!branchId) return;

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    const driversRef = ref(db, `branches/${branchId}/delivery/drivers`);
    const unsub = onValue(driversRef, (snap) => {
      const data = snap.val();
      if (!data) {
        setDrivers([]);
        return;
      }
      const drivers: DeliveryDriver[] = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        name: val.name || '',
        phone: val.phone || '',
        vehicle: val.vehicle || '',
        active: val.active !== false,
        available: val.available !== false,
        totalDeliveries: val.totalDeliveries || 0,
      }));
      setDrivers(drivers);
    });

    unsubRef.current = unsub;
    return () => {
      unsub();
      useDeliveryStore.getState().reset();
    };
  }, [branchId, setDrivers]);
}
