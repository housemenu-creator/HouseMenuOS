import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

const DEFAULT_STATIONS = {
  all: { label: 'Todas', icon: 'LayoutGrid', order: -1 },
  grill: { label: 'Grill', icon: 'Flame', basePrepTime: 10, order: 0 },
  fryer: { label: 'Fritura', icon: 'Tally1', basePrepTime: 8, order: 1 },
  cold: { label: 'Frío', icon: 'Snowflake', basePrepTime: 4, order: 2 },
  bakery: { label: 'Panadería', icon: 'Wheat', basePrepTime: 6, order: 3 },
  expo: { label: 'Expeditor', icon: 'ClipboardCheck', basePrepTime: 2, order: 4 },
};

export default function useStationConfig(branchId) {
  const [stations, setStations] = useState(DEFAULT_STATIONS);

  useEffect(() => {
    if (!branchId) return;
    const configRef = ref(db, `branches/${branchId}/config/stations`);
    const unsub = onValue(configRef, (snap) => {
      const data = snap.val();
      if (data) {
        setStations({ ...DEFAULT_STATIONS, ...data });
      }
    });
    return unsub;
  }, [branchId]);

  return stations;
}
