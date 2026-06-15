import { useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import useCatalogStore from '../store/catalogStore';
import useWorkerSessionStore from '../store/workerSessionStore';

export default function useCatalogSync() {
  const branchId = useWorkerSessionStore((s) => s.session?.branchId);
  const setProducts = useCatalogStore((s) => s.setProducts);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!branchId) return;

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    const catalogRef = ref(db, `branches/${branchId}/menu`);
    const unsub = onValue(catalogRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      const products = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        ...val,
      }));
      setProducts(products);
    });

    unsubRef.current = unsub;
    return () => {
      unsub();
      useCatalogStore.getState().reset();
    };
  }, [branchId, setProducts]);
}
