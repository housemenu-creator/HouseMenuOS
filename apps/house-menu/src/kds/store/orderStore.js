import { create } from 'zustand';
import { STATION_KEYWORDS, KITCHEN_STATIONS, STATION_PREP_TIMES } from '../kdsTypes';

function inferStationFromItem(itemName) {
  if (!itemName) return 'expo';
  const name = itemName.toLowerCase();
  for (const [station, keywords] of Object.entries(STATION_KEYWORDS)) {
    if (keywords.some((kw) => name.includes(kw))) return station;
  }
  return 'expo';
}

function inferOrderStation(order) {
  if (!order?.items || order.items.length === 0) return 'expo';
  const stationCounts = {};
  order.items.forEach((item) => {
    const st = inferStationFromItem(item.name || '');
    stationCounts[st] = (stationCounts[st] || 0) + (item.quantity || 1);
  });
  return Object.entries(stationCounts).sort((a, b) => b[1] - a[1])[0][0];
}

function calcPacingStatus(dueTime) {
  const diff = dueTime - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 2 * 60 * 1000) return 'due';
  return 'ahead';
}

function calcDueTime(order) {
  const station = order.station || inferOrderStation(order);
  const prepMin = STATION_PREP_TIMES[station] || 5;
  const createdAt = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
  return createdAt + prepMin * 60 * 1000;
}

function calcItemStations(items) {
  return (items || []).map((item) => ({
    ...item,
    station: item.station || inferStationFromItem(item.name || ''),
  }));
}

function normalizeOrder(raw) {
  const items = calcItemStations(raw.items);
  const station = raw.station || inferOrderStation(raw);
  const dueTime = calcDueTime({ ...raw, items, station });
  return {
    id: raw.id,
    status: raw.status || 'recibido',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt,
    customerName: raw.customerName || raw.customer?.name || '',
    items,
    financials: raw.financials || {},
    observaciones: raw.observaciones || '',
    statusTimestamps: raw.statusTimestamps || {},
    station,
    dueTime,
    pacingStatus: calcPacingStatus(dueTime),
    priority: raw.priority || 'normal',
    location: raw.location || '',
    tableNumber: raw.tableNumber || '',
    allergens: raw.allergens || [],
    deliveryDate: raw.deliveryDate || null,
    source: raw.source || '',
  };
}

function sortByCreatedAt(orders) {
  return [...orders].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
}

const useOrderStore = create((set, get) => ({
  orders: {},
  orderIndex: [],
  isLoading: true,

  applyAdd: (rawOrder) => {
    const order = normalizeOrder(rawOrder);
    set((state) => {
      if (state.orders[order.id]) return state;
      const orders = { ...state.orders, [order.id]: order };
      const orderIndex = sortByCreatedAt(Object.values(orders)).map((o) => o.id);
      return { orders, orderIndex, isLoading: false };
    });
  },

  applyChange: (rawOrder) => {
    const order = normalizeOrder(rawOrder);
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
      const { [orderId]: removed, ...orders } = state.orders;
      const orderIndex = state.orderIndex.filter((id) => id !== orderId);
      return { orders, orderIndex, isLoading: Object.keys(orders).length === 0 };
    });
  },

  setInitialOrders: (initialOrders) => {
    const orderMap = {};
    initialOrders.forEach((raw) => {
      const order = normalizeOrder(raw);
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

  getFilteredOrders: (status, station, searchQuery) => {
    const { orders, orderIndex } = get();
    const q = searchQuery?.trim().toLowerCase() || '';
    return orderIndex
      .filter((id) => {
        const o = orders[id];
        if (status && o.status !== status) return false;
        if (station && station !== 'all') {
          const hasStation = o.station === station || o.items?.some((i) => i.station === station);
          if (!hasStation) return false;
        }
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
      .filter((id) => orders[id].status !== 'entregado' && orders[id].status !== 'cancelado')
      .map((id) => orders[id]);
  },

  getHistoryOrders: () => {
    const { orders, orderIndex } = get();
    return orderIndex
      .filter((id) => orders[id].status === 'entregado' || orders[id].status === 'cancelado')
      .map((id) => orders[id]);
  },

  getStationCounts: (station) => {
    const { orders, orderIndex } = get();
    const counts = { all: orderIndex.length };
    for (const id of orderIndex) {
      const o = orders[id];
      const s = o.station || 'all';
      counts[s] = (counts[s] || 0) + 1;
    }
    return station ? (counts[station] || 0) : counts;
  },
}));

export default useOrderStore;
