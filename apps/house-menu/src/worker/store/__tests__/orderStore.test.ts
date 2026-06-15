import { describe, it, expect, beforeEach } from 'vitest';
import useOrderStore from '../orderStore';

const mockOrder = (overrides = {}) => ({
  id: 'ord-001',
  status: 'recibido',
  createdAt: '2025-01-01T10:00:00Z',
  customerName: 'Juan Perez',
  items: [{ name: 'Parrilla', quantity: 2, price: 25 }],
  ...overrides,
});

describe('orderStore', () => {
  beforeEach(() => {
    useOrderStore.getState().reset();
  });

  it('starts with no orders and loading true', () => {
    const state = useOrderStore.getState();
    expect(state.isLoading).toBe(true);
    expect(Object.keys(state.orders)).toHaveLength(0);
    expect(state.orderIndex).toHaveLength(0);
  });

  describe('applyAdd', () => {
    it('adds a new order', () => {
      useOrderStore.getState().applyAdd(mockOrder());
      const state = useOrderStore.getState();
      expect(state.orders['ord-001']).toBeDefined();
      expect(state.orderIndex).toContain('ord-001');
      expect(state.isLoading).toBe(false);
    });

    it('normalizes missing fields', () => {
      useOrderStore.getState().applyAdd({ id: 'ord-002' });
      const order = useOrderStore.getState().orders['ord-002'];
      expect(order.status).toBe('recibido');
      expect(order.customerName).toBe('');
      expect(order.items).toEqual([]);
      expect(order.priority).toBe('normal');
      expect(order.createdAt).toBeDefined();
    });

    it('ignores duplicate ids', () => {
      useOrderStore.getState().applyAdd(mockOrder());
      const firstIndex = useOrderStore.getState().orderIndex.length;
      useOrderStore.getState().applyAdd(mockOrder());
      expect(useOrderStore.getState().orderIndex.length).toBe(firstIndex);
    });
  });

  describe('applyChange', () => {
    it('updates an existing order', () => {
      useOrderStore.getState().applyAdd(mockOrder());
      useOrderStore.getState().applyChange({ id: 'ord-001', status: 'preparando' });
      expect(useOrderStore.getState().orders['ord-001'].status).toBe('preparando');
    });

    it('adds order if not exists', () => {
      useOrderStore.getState().applyChange({ id: 'ord-003', status: 'listo' });
      expect(useOrderStore.getState().orders['ord-003']).toBeDefined();
    });
  });

  describe('applyRemove', () => {
    it('removes an order', () => {
      useOrderStore.getState().applyAdd(mockOrder());
      useOrderStore.getState().applyRemove('ord-001');
      expect(useOrderStore.getState().orders['ord-001']).toBeUndefined();
      expect(useOrderStore.getState().orderIndex).not.toContain('ord-001');
    });
  });

  describe('setInitialOrders', () => {
    it('sets multiple orders', () => {
      const orders = [
        mockOrder({ id: 'a' }),
        mockOrder({ id: 'b', status: 'preparando' }),
      ];
      useOrderStore.getState().setInitialOrders(orders);
      expect(Object.keys(useOrderStore.getState().orders)).toHaveLength(2);
      expect(useOrderStore.getState().isLoading).toBe(false);
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      const store = useOrderStore.getState();
      store.setInitialOrders([
        mockOrder({ id: 'a', status: 'recibido' }),
        mockOrder({ id: 'b', status: 'preparando' }),
        mockOrder({ id: 'c', status: 'listo' }),
        mockOrder({ id: 'd', status: 'entregado' }),
        mockOrder({ id: 'e', status: 'cancelado' }),
      ]);
    });

    it('getOrder returns a single order', () => {
      expect(useOrderStore.getState().getOrder('a')?.status).toBe('recibido');
      expect(useOrderStore.getState().getOrder('nonexistent')).toBeNull();
    });

    it('getOrdersByStatus filters by status', () => {
      const recibidos = useOrderStore.getState().getOrdersByStatus('recibido');
      expect(recibidos).toHaveLength(1);
      expect(recibidos[0].id).toBe('a');
    });

    it('getActiveOrders returns non-final orders', () => {
      const active = useOrderStore.getState().getActiveOrders();
      expect(active).toHaveLength(3);
      expect(active.map((o) => o.id)).toEqual(['a', 'b', 'c']);
    });

    it('getHistoryOrders returns final orders', () => {
      const history = useOrderStore.getState().getHistoryOrders();
      expect(history).toHaveLength(2);
      expect(history.map((o) => o.id)).toEqual(['d', 'e']);
    });

    it('getFilteredOrders filters by status', () => {
      const result = useOrderStore.getState().getFilteredOrders({ status: 'listo' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c');
    });

    it('getFilteredOrders filters by search query', () => {
      const result = useOrderStore.getState().getFilteredOrders({ searchQuery: 'juan' });
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('getFilteredOrders filters by branchId', () => {
      const store = useOrderStore.getState();
      store.applyAdd(mockOrder({ id: 'f', branchId: 'branch-2' }));
      const result = useOrderStore.getState().getFilteredOrders({ branchId: 'branch-2' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('f');
    });

    it('getStatusCounts returns all counts', () => {
      const counts = useOrderStore.getState().getStatusCounts() as Record<string, number>;
      expect(counts.all).toBe(5);
      expect(counts.recibido).toBe(1);
      expect(counts.entregado).toBe(1);
    });

    it('getStatusCounts returns count for specific status', () => {
      expect(useOrderStore.getState().getStatusCounts('recibido')).toBe(1);
      expect(useOrderStore.getState().getStatusCounts('unknown')).toBe(0);
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      useOrderStore.getState().applyAdd(mockOrder());
      useOrderStore.getState().reset();
      const state = useOrderStore.getState();
      expect(Object.keys(state.orders)).toHaveLength(0);
      expect(state.orderIndex).toHaveLength(0);
      expect(state.isLoading).toBe(true);
    });
  });
});
