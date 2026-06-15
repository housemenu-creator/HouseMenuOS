import { STATION_KEYWORDS } from '../kdsTypes';

export function inferStationFromItem(itemName) {
  if (!itemName) return 'expo';
  const name = itemName.toLowerCase();
  for (const [station, keywords] of Object.entries(STATION_KEYWORDS)) {
    if (keywords.some((kw) => name.includes(kw))) return station;
  }
  return 'expo';
}

export function inferOrderStation(order) {
  if (!order?.items || order.items.length === 0) return 'expo';
  const stationCounts = {};
  order.items.forEach((item) => {
    const st = inferStationFromItem(item.name || '');
    stationCounts[st] = (stationCounts[st] || 0) + (item.quantity || 1);
  });
  return Object.entries(stationCounts).sort((a, b) => b[1] - a[1])[0][0];
}
