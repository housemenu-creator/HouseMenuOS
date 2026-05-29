import { useState, useMemo, useCallback } from 'react';
import { PRIORITY, PRIORITY_CONFIG, KITCHEN_STATIONS } from '../kdsTypes';

const STATION_KEYWORDS = {
  grill: ['parrilla', 'grill', 'carne', 'res', 'pollo a la parrilla', 'lomo', 'steak', 'burger', 'hamburguesa'],
  fryer: ['fritura', 'frito', 'papas', 'papa', 'fried', 'crujiente', 'empanizado', 'milanesa', 'nugget'],
  cold: ['ensalada', 'ceviche', 'frío', 'cold', 'salad', 'helado', 'postre frío', 'sushi', 'tiradito'],
  bakery: ['pan', 'bread', 'torta', 'pastel', 'bakery', 'pastry', 'croissant', 'donut', 'pancake', 'waffle'],
};

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

export function useOrders(orders) {
  const [stationFilter, setStationFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortByPriority, setSortByPriority] = useState(true);

  const enrichedOrders = useMemo(() => {
    return orders.map((o) => ({
      ...o,
      station: o.station || inferOrderStation(o),
    }));
  }, [orders]);

  const stationCounts = useMemo(() => {
    const counts = Object.fromEntries(KITCHEN_STATIONS.map((s) => [s, 0]));
    counts.all = orders.length;
    enrichedOrders.forEach((o) => {
      if (counts[o.station] !== undefined) counts[o.station]++;
    });
    return counts;
  }, [enrichedOrders, orders]);

  const filteredOrders = useMemo(() => {
    let result = stationFilter === 'all'
      ? enrichedOrders
      : enrichedOrders.filter((o) => o.station === stationFilter);

    if (sortByPriority && result.length > 1) {
      result = [...result].sort((a, b) => {
        const pa = PRIORITY_CONFIG[a.priority || PRIORITY.NORMAL]?.order ?? 1;
        const pb = PRIORITY_CONFIG[b.priority || PRIORITY.NORMAL]?.order ?? 1;
        if (pa !== pb) return pa - pb;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }

    return result;
  }, [enrichedOrders, stationFilter, sortByPriority]);

  const toggleSelect = useCallback((orderId) => {
    setSelectedIds((prev) => {
      if (prev.has(orderId)) {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      }
      const next = new Set(prev);
      next.add(orderId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return {
    stationFilter,
    setStationFilter,
    selectedIds,
    toggleSelect,
    clearSelection,
    stationCounts,
    filteredOrders,
    sortByPriority,
    setSortByPriority,
  };
}
