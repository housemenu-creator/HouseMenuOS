export const KITCHEN_STATIONS = ['all', 'grill', 'fryer', 'cold', 'bakery', 'expo'] as const;

export type KitchenStation = typeof KITCHEN_STATIONS[number];

export const STATION_CONFIG = {
  all: { label: 'Todas', icon: 'LayoutGrid' },
  grill: { label: 'Grill', icon: 'Flame' },
  fryer: { label: 'Fritura', icon: 'Tally1' },
  cold: { label: 'Frío', icon: 'Snowflake' },
  bakery: { label: 'Panadería', icon: 'Wheat' },
  expo: { label: 'Expeditor', icon: 'ClipboardCheck' },
} as const;

export const STATION_KEYWORDS = {
  grill: ['parrilla', 'grill', 'carne', 'res', 'pollo a la parrilla', 'lomo', 'steak', 'burger', 'hamburguesa'],
  fryer: ['fritura', 'frito', 'papas', 'papa', 'fried', 'crujiente', 'empanizado', 'milanesa', 'nugget'],
  cold: ['ensalada', 'ceviche', 'frío', 'cold', 'salad', 'helado', 'postre frío', 'sushi', 'tiradito'],
  bakery: ['pan', 'bread', 'torta', 'pastel', 'bakery', 'pastry', 'croissant', 'donut', 'pancake', 'waffle'],
} as const;

export const STATION_PREP_TIMES = {
  all: 0,
  grill: 10,
  fryer: 8,
  cold: 4,
  bakery: 6,
  expo: 2,
} as const;

export function inferStationFromItem(itemName: string): KitchenStation {
  if (!itemName) return 'expo';
  const name = itemName.toLowerCase();
  for (const [station, keywords] of Object.entries(STATION_KEYWORDS)) {
    if (keywords.some((kw) => name.includes(kw))) return station as KitchenStation;
  }
  return 'expo';
}

export function inferOrderStation(order: { items?: Array<{ name?: string; quantity?: number }> }): KitchenStation {
  if (!order?.items || order.items.length === 0) return 'expo';
  const stationCounts: Record<string, number> = {};
  order.items.forEach((item) => {
    const st = inferStationFromItem(item.name || '');
    stationCounts[st] = (stationCounts[st] || 0) + (item.quantity || 1);
  });
  return Object.entries(stationCounts).sort((a, b) => b[1] - a[1])[0][0] as KitchenStation;
}

export function getPrepTime(station: KitchenStation): number {
  return STATION_PREP_TIMES[station] ?? STATION_PREP_TIMES.expo;
}