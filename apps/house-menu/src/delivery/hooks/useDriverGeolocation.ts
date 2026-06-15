import { useEffect, useRef, useCallback } from 'react';
import { ref, set, serverTimestamp } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

const UPDATE_INTERVAL_MS = 15000; // every 15s
const MIN_DISPLACEMENT_M = 20; // only update if moved >20m

interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: number;
}

/**
 * Tracks the driver's geolocation and writes it to Firebase periodically.
 * Call once in the RepartidorView when driverId is available.
 */
export function useDriverGeolocation(branchId: string | null, driverId: string | null) {
  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPosRef = useRef<GeoPosition | null>(null);

  const savePosition = useCallback(
    async (pos: GeoPosition) => {
      if (!branchId || !driverId) return;
      try {
        const posRef = ref(db, `branches/${branchId}/delivery/drivers/${driverId}/lastPosition`);
        await set(posRef, {
          lat: pos.lat,
          lng: pos.lng,
          accuracy: pos.accuracy,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // silently fail — geolocation is ancillary
      }
    },
    [branchId, driverId]
  );

  useEffect(() => {
    if (!branchId || !driverId) return;

    // Periodically flush latest position to Firebase
    intervalRef.current = setInterval(() => {
      if (latestPosRef.current) {
        savePosition(latestPosRef.current);
      }
    }, UPDATE_INTERVAL_MS);

    // Start watching position
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude: lat, longitude: lng, accuracy } = position.coords;
          const last = lastPosRef.current;

          // Skip if haven't moved enough
          if (last) {
            const R = 6371000;
            const dLat = ((lat - last.lat) * Math.PI) / 180;
            const dLng = ((lng - last.lng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((last.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
            const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            if (dist < MIN_DISPLACEMENT_M) return;
          }

          lastPosRef.current = { lat, lng };
          latestPosRef.current = { lat, lng, accuracy, updatedAt: Date.now() };
        },
        (err) => {
          console.warn('Geo error:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Clear position when leaving
      if (branchId && driverId) {
        const posRef = ref(db, `branches/${branchId}/delivery/drivers/${driverId}/lastPosition`);
        set(posRef, null).catch(() => {});
      }
    };
  }, [branchId, driverId, savePosition]);
}
