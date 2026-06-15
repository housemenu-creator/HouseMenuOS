import { useMemo } from 'react';
import useOrderStore from '../../worker/store/orderStore';

export function useDriverDelivery(driverId: string | null, filter: 'activas' | 'entregadas') {
  const orders = useOrderStore((s) => s.orders);
  const orderIndex = useOrderStore((s) => s.orderIndex);

  return useMemo(() => {
    if (!driverId) return [];

    let result = orderIndex
      .map((id) => orders[id])
      .filter((o) => o && o.driverId === driverId && ((o.type || o.order_type || '') as string).toLowerCase().includes('delivery'));

    if (filter === 'activas') {
      result = result.filter((o) => o.status === 'en_camino' || o.status === 'listo');
    } else if (filter === 'entregadas') {
      result = result.filter((o) => o.status === 'entregado');
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orderIndex, orders, driverId, filter]);
}

export function useDriverStats(driverId: string | null) {
  const orders = useOrderStore((s) => s.orders);
  const orderIndex = useOrderStore((s) => s.orderIndex);

  return useMemo(() => {
    if (!driverId) return { total: 0, delivered: 0, pending: 0 };

    const myOrders = orderIndex
      .map((id) => orders[id])
      .filter((o) => o && o.driverId === driverId);

    const total = myOrders.length;
    const delivered = myOrders.filter((o) => o.status === 'entregado').length;
    return { total, delivered, pending: total - delivered };
  }, [orderIndex, orders, driverId]);
}
