/**
 * Core Order Store — canonical source of truth for all orders.
 *
 * This is the ONLY store that subscribes to Firebase and holds raw order data.
 * Domain-specific stores (mozo, kds, dispatch, etc.) import from here and
 * expose only what their domain needs, never the raw store directly.
 *
 * If you need to add a selector or derived data, add it to your DOMAIN's store,
 * not here. This store stays lean: orders, orderIndex, actions, and basic queries.
 */
import { create } from 'zustand';
import type { Order } from '../../worker/workerTypes';
import { ACTIVE_STATUSES, FINAL_STATUSES } from '../../worker/workerTypes';

interface OrderMap {
  [orderId: string]: Order;
}

interface OrderState {
  orders: OrderMap;
  orderIndex: string[];
  isLoading: boolean;

  applyAdd: (raw: Partial<Order> & { id: string }) => void;
  applyChange: (raw: Partial<Order> & { id: string }) => void;
  applyRemove: (orderId: string) => void;
  setInitialOrders: (initialOrders: Partial<Order>[]) => OrderMap;
  setLoading: (loading: boolean) => void;
  reset: () => void;

  getOrder: (orderId: string) => Order | null;
  getOrdersByStatus: (status: string) => Order[];
  getFilteredOrders: (filters: {
    status?: string;
    station?: string;
    searchQuery?: string;
    branchId?: string;
  }) => Order[];
  getActiveOrders: () => Order[];
  getHistoryOrders: () => Order[];
  getStatusCounts: (status?: string) => Record<string, number> | number;
}

function sortByCreatedAt(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
}

function normalizeOrder(raw: Partial<Order> & { id: string }): Order {
  return {
    id: raw.id,
    status: raw.status || 'recibido',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt,
    customerName: raw.customerName || '',
    items: raw.items || [],
    financials: raw.financials,
    observaciones: raw.observaciones || '',
    statusTimestamps: raw.statusTimestamps || {},
    priority: raw.priority || 'normal',
    location: raw.location || '',
    tableNumber: raw.tableNumber || '',
    allergens: raw.allergens || [],
    deliveryDate: raw.deliveryDate,
    source: raw.source || '',
    branchId: raw.branchId || '',
    type: raw.type || raw.order_type || '',
    driverId: raw.driverId || '',
    driverName: raw.driverName || '',
    station: raw.station || '',
    dueTime: raw.dueTime || 0,
    pacingStatus: raw.pacingStatus || 'ahead',
    payment_status: raw.payment_status,
    payment_method: raw.payment_method,
    collectedBy: raw.collectedBy,
    collectedAt: raw.collectedAt,
  };
}

const useOrderStore = create<OrderState>()((set, get) => ({
  orders: {},
  orderIndex: [],
  isLoading: true,

  applyAdd: (raw) => {
    const order = normalizeOrder(raw);
    set((state) => {
      if (state.orders[order.id]) return state;
      const orders = { ...state.orders, [order.id]: order };
      const orderIndex = sortByCreatedAt(Object.values(orders)).map((o) => o.id);
      return { orders, orderIndex, isLoading: false };
    });
  },

  applyChange: (raw) => {
    const order = normalizeOrder(raw);
    set((state) => {
      const existing = state.orders[order.id];
      if (!existing) {
        const orders = { ...state.orders, [order.id]: order };
        const orderIndex = sortByCreatedAt(Object.values(orders)).map((o) => o.id);
        return { orders, orderIndex };
      }
      const orders = { ...state.orders, [order.id]: { ...existing, ...order } };
      return { orders };
    });
  },

  applyRemove: (orderId) => {
    set((state) => {
      const { [orderId]: _removed, ...orders } = state.orders;
      const orderIndex = state.orderIndex.filter((id) => id !== orderId);
      return { orders, orderIndex, isLoading: Object.keys(orders).length === 0 };
    });
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setInitialOrders: (initialOrders) => {
    const orderMap: OrderMap = {};
    initialOrders.forEach((raw) => {
      const order = normalizeOrder(raw as Partial<Order> & { id: string });
      orderMap[order.id] = order;
    });
    const orderIndex = sortByCreatedAt(Object.values(orderMap)).map((o) => o.id);
    set({ orders: orderMap, orderIndex, isLoading: false });
    return orderMap;
  },

  reset: () => set({ orders: {}, orderIndex: [], isLoading: true }),

  getOrder: (orderId) => get().orders[orderId] || null,

  getOrdersByStatus: (status) => {
    const { orders, orderIndex } = get();
    return orderIndex
      .filter((id) => orders[id].status === status)
      .map((id) => orders[id]);
  },

  getFilteredOrders: (filters) => {
    const { orders, orderIndex } = get();
    const q = filters.searchQuery?.trim().toLowerCase() || '';
    return orderIndex
      .filter((id) => {
        const o = orders[id];
        if (filters.status && o.status !== filters.status) return false;
        if (filters.station && filters.station !== 'all') {
          const hasStation = o.station === filters.station
            || o.items?.some((i) => i.station === filters.station);
          if (!hasStation) return false;
        }
        if (filters.branchId && o.branchId !== filters.branchId) return false;
        if (q) {
          const match = o.customerName?.toLowerCase().includes(q)
            || o.id?.toLowerCase().includes(q)
            || o.id?.slice(-6).toLowerCase() === q
            || o.location?.toLowerCase().includes(q)
            || o.tableNumber?.toString().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .map((id) => orders[id]);
  },

  getActiveOrders: () => {
    const { orders, orderIndex } = get();
    return orderIndex
      .filter((id) => ACTIVE_STATUSES.includes(orders[id].status))
      .map((id) => orders[id]);
  },

  getHistoryOrders: () => {
    const { orders, orderIndex } = get();
    return orderIndex
      .filter((id) => FINAL_STATUSES.includes(orders[id].status))
      .map((id) => orders[id]);
  },

  getStatusCounts: (status) => {
    const { orders, orderIndex } = get();
    const counts: Record<string, number> = { all: orderIndex.length };
    for (const id of orderIndex) {
      const s = orders[id].status || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    }
    return status ? (counts[status] || 0) : counts;
  },
}));

export default useOrderStore;
export type { OrderState };
