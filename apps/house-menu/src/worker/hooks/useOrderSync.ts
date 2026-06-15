import { useEffect, useRef } from 'react';
import { subscribeOrdersDelta } from '../../kds/data/orderSubscription';
import useOrderStore from '../store/orderStore';
import useWorkerSessionStore from '../store/workerSessionStore';

interface UseOrderSyncOptions {
  branchId?: string;
}

export default function useOrderSync(options?: UseOrderSyncOptions) {
  const sessionBranchId = useWorkerSessionStore((s) => s.session?.branchId);
  const branchId = options?.branchId || sessionBranchId;
  const applyAdd = useOrderStore((s) => s.applyAdd);
  const applyChange = useOrderStore((s) => s.applyChange);
  const applyRemove = useOrderStore((s) => s.applyRemove);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!branchId) return;

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    const unsub = subscribeOrdersDelta(branchId, {
      onAdd: (raw: Record<string, unknown> & { id: string }) => applyAdd(raw),
      onChange: (raw: Record<string, unknown> & { id: string }) => applyChange(raw),
      onRemove: (orderId: string) => applyRemove(orderId),
    });

    unsubRef.current = unsub;
    return () => {
      unsub();
      useOrderStore.getState().reset();
    };
  }, [branchId, applyAdd, applyChange, applyRemove]);
}
