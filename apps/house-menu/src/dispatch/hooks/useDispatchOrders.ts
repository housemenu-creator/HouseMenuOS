import { useMemo, useEffect, useState } from 'react';
import useOrderStore from '../../worker/store/orderStore';
import { calculateWaitingTime } from '../../lib/deliveryService';
import type { Order } from '../../worker/workerTypes';

export interface DispatchOrder extends Order {
  waitingMs: number;
}

export function useDispatchOrders() {
  const orders = useOrderStore((s) => s.orders);
  const orderIndex = useOrderStore((s) => s.orderIndex);
  const [tick, setTick] = useState(0);

  // Recompute waiting times every 15s so counters stay live
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    const allOrders = orderIndex.map((id) => orders[id]).filter(Boolean) as Order[];

    const enrich = (o: Order): DispatchOrder => ({
      ...o,
      waitingMs: calculateWaitingTime(o.updatedAt || o.createdAt),
    });

    return {
      listos: allOrders.filter((o) => o.status === 'listo').map(enrich),
      enCamino: allOrders.filter((o) => o.status === 'en_camino').map(enrich),
    };
    // tick forces recalculation so waitingMs stays current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIndex, orders, tick]);
}
