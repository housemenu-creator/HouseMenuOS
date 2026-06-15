import type { Order } from '../../worker/workerTypes';
import type { KitchenStation } from './stations';
import type { Priority } from './priorities';
import { getPrepTime } from './stations';
import { calcDueTime } from './timing';
import { getPriority, sortByPriority } from './priorities';

export interface EnrichedOrder extends Order {
  station: KitchenStation;
  dueTime: number;
  prepTime: number;
  priority: Priority;
  urgency: 'safe' | 'warning' | 'critical';
}

export function enrichOrders(orders: Order[]): EnrichedOrder[] {
  return orders.map((order) => {
    const station = order.station || inferOrderStation(order);
    const prepTime = getPrepTime(station);
    const dueTime = calcDueTime({ ...order, station }, prepTime * 60 * 1000);
    const priority = getPriority(order);
    const elapsed = Date.now() - (order.statusTimestamps?.[order.status || ''] || order.createdAt ? new Date(order.statusTimestamps?.[order.status || ''] || order.createdAt).getTime() : Date.now());
    const urgency = elapsed >= 12 * 60 * 1000 ? 'critical' : elapsed >= 8 * 60 * 1000 ? 'warning' : 'safe';
    return { ...order, station, dueTime, prepTime, priority, urgency };
  });
}

function inferOrderStation(order: Order): KitchenStation {
  if (!order?.items || order.items.length === 0) return 'expo';
  const stationCounts: Record<string, number> = {};
  order.items.forEach((item) => {
    const st = inferStationFromItem(item.name || '');
    stationCounts[st] = (stationCounts[st] || 0) + (item.quantity || 1);
  });
  return Object.entries(stationCounts).sort((a, b) => b[1] - a[1])[0][0] as KitchenStation;
}

function inferStationFromItem(itemName: string): KitchenStation {
  if (!itemName) return 'expo';
  const name = itemName.toLowerCase();
  const STATION_KEYWORDS = {
    grill: ['parrilla', 'grill', 'carne', 'res', 'pollo a la parrilla', 'lomo', 'steak', 'burger', 'hamburguesa'],
    fryer: ['fritura', 'frito', 'papas', 'papa', 'fried', 'crujiente', 'empanizado', 'milanesa', 'nugget'],
    cold: ['ensalada', 'ceviche', 'frío', 'cold', 'salad', 'helado', 'postre frío', 'sushi', 'tiradito'],
    bakery: ['pan', 'bread', 'torta', 'pastel', 'bakery', 'pastry', 'croissant', 'donut', 'pancake', 'waffle'],
  };
  for (const [station, keywords] of Object.entries(STATION_KEYWORDS)) {
    if (keywords.some((kw) => name.includes(kw))) return station as KitchenStation;
  }
  return 'expo';
}

export function filterByStation(orders: EnrichedOrder[], station: KitchenStation): EnrichedOrder[] {
  if (station === 'all') return orders;
  return orders.filter((o) => o.station === station || o.items?.some((i) => inferStationFromItem(i.name || '') === station));
}

export function sortByDueTime<T extends { dueTime?: number }>(orders: T[]): T[] {
  return [...orders].sort((a, b) => (a.dueTime ?? 0) - (b.dueTime ?? 0));
}

export function buildColumnOrders(
  orders: EnrichedOrder[],
  visibleColumns: string[],
  customOrder: Record<string, string[]>
): Record<string, EnrichedOrder[]> {
  const result: Record<string, EnrichedOrder[]> = {};
  const sorted = sortByDueTime(orders);

  for (const col of visibleColumns) {
    const custom = customOrder[col];
    if (custom && custom.length > 0) {
      const customMap = new Map(sorted.map((o) => [o.id, o]));
      const ordered: EnrichedOrder[] = [];
      const remaining: EnrichedOrder[] = [];
      const seen = new Set<string>();
      for (const id of custom) {
        if (customMap.has(id)) {
          ordered.push(customMap.get(id)!);
          seen.add(id);
        }
      }
      for (const o of sorted) {
        if (!seen.has(o.id)) remaining.push(o);
      }
      result[col] = [...ordered, ...remaining];
    } else {
      result[col] = sorted.filter((o) => o.station === col || col === 'all');
    }
  }
  return result;
}