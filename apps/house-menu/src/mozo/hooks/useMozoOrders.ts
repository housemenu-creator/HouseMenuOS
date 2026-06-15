import { useMemo } from 'react';
import useOrderStore from '../../worker/store/orderStore';

export function useMozoOrders(filter: 'activos' | 'entregados' | 'todos', searchQuery: string) {
  const orders = useOrderStore((s) => s.orders);
  const orderIndex = useOrderStore((s) => s.orderIndex);

  return useMemo(() => {
    let result = orderIndex.map((id) => orders[id]).filter(Boolean);

    if (filter === 'activos') {
      result = result.filter((o) => o.status !== 'entregado' && o.status !== 'cancelado');
    } else if (filter === 'entregados') {
      result = result.filter((o) => o.status === 'entregado');
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.id || '').toLowerCase().includes(q) ||
          (o.location || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orderIndex, orders, filter, searchQuery]);
}
