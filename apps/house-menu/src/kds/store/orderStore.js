import useOrderStore from '../../worker/store/orderStore';
import { STATION_PREP_TIMES } from '../kdsTypes';
import { inferStationFromItem, inferOrderStation } from '../utils/stationInference';

function calcDueTime(order) {
  const station = order.station || inferOrderStation(order);
  const prepMin = STATION_PREP_TIMES[station] || 5;
  const createdAt = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
  return createdAt + prepMin * 60 * 1000;
}

export function enrichOrder(raw) {
  const items = (raw.items || []).map((item) => ({
    ...item,
    station: item.station || inferStationFromItem(item.name || ''),
  }));
  const station = raw.station || inferOrderStation(raw);
  const dueTime = calcDueTime({ ...raw, items, station });
  return {
    ...raw,
    items,
    station,
    dueTime,
    pacingStatus: dueTime - Date.now() < 0 ? 'overdue' : dueTime - Date.now() < 2 * 60 * 1000 ? 'due' : 'ahead',
  };
}

export function useEnrichedOrders() {
  const orders = useOrderStore((s) => s.orders);
  const orderIndex = useOrderStore((s) => s.orderIndex);
  return orderIndex.map((id) => {
    const raw = orders[id];
    if (!raw) return null;
    return enrichOrder(raw);
  }).filter(Boolean);
}

export { calcDueTime };
export default useOrderStore;
