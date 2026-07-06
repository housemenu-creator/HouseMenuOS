import { useEffect, useRef } from 'react';
import { ref, get } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { subscribeOrdersDelta } from '../../kds/data/orderSubscription';
import useOrderStore from '../store/orderStore';
import useWorkerSessionStore from '../store/workerSessionStore';
import type { Order } from '../workerTypes';

interface UseOrderSyncOptions {
  branchId?: string;
}

function getOrdersPath(branchId: string) {
  return `branches/${branchId || 'monteverde'}/orders`;
}

export default function useOrderSync(options?: UseOrderSyncOptions) {
  const sessionBranchId = useWorkerSessionStore((s) => s.session?.branchId);
  const branchId = options?.branchId || sessionBranchId;
  const applyAdd = useOrderStore((s) => s.applyAdd);
  const applyChange = useOrderStore((s) => s.applyChange);
  const applyRemove = useOrderStore((s) => s.applyRemove);
  const setLoading = useOrderStore((s) => s.setLoading);
  const unsubRef = useRef<(() => void) | null>(null);
  const initDoneRef = useRef(false);

  useEffect(() => {
    initDoneRef.current = false;

    // Si no hay branch, salir del loading inmediatamente
    if (!branchId) {
      setLoading(false);
      return;
    }

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    // 1) Obtener estado inicial (incluso si está vacío) para salir del loading
    const ordersRef = ref(db, getOrdersPath(branchId));
    get(ordersRef).then((snap) => {
      const data = snap.val();
      if (data) {
        const orders = Object.entries(data).map(([id, val]) => ({ id, ...val as Record<string, unknown> }));
        useOrderStore.getState().setInitialOrders(orders as Partial<Order>[]);
      } else {
        // No hay pedidos — salir del loading igual, mostrar empty state
        setLoading(false);
      }
      initDoneRef.current = true;
    });

    // 2) Suscribirse a cambios en tiempo real
    const unsub = subscribeOrdersDelta(branchId, {
      onAdd: (raw: Record<string, unknown> & { id: string }) => applyAdd(raw),
      onChange: (raw: Record<string, unknown> & { id: string }) => applyChange(raw),
      onRemove: (orderId: string) => applyRemove(orderId),
    });

    // 3) Timeout de seguridad: si después de 10s no cargó nada, salir del loading
    const safetyTimeout = setTimeout(() => {
      if (!initDoneRef.current) {
        setLoading(false);
      }
    }, 10000);

    unsubRef.current = () => {
      clearTimeout(safetyTimeout);
      unsub();
    };

    return () => {
      clearTimeout(safetyTimeout);
      unsub();
      useOrderStore.getState().reset();
    };
  }, [branchId, applyAdd, applyChange, applyRemove, setLoading]);
}
