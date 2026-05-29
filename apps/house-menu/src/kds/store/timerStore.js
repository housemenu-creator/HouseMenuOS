import { create } from 'zustand';

const THRESHOLDS = {
  warning: 8 * 60 * 1000,
  critical: 12 * 60 * 1000,
};

function calcElapsed(order, now) {
  const ts = order.statusTimestamps?.[order.status] || order.createdAt;
  if (!ts) return 0;
  return now - new Date(ts).getTime();
}

const useTimerStore = create((set, get) => ({
  elapsed: {},
  intervalId: null,

  recalcVisible: (visibleOrders) => {
    const now = Date.now();
    const elapsed = {};
    for (const order of visibleOrders) {
      elapsed[order.id] = calcElapsed(order, now);
    }
    set({ elapsed });
  },

  tickVisible: (visibleOrders) => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = {};
      for (const order of visibleOrders) {
        elapsed[order.id] = calcElapsed(order, now);
      }
      set({ elapsed });
    }, 1000);
    set({ intervalId });
  },

  stopTicker: () => {
    const { intervalId } = get();
    if (intervalId) {
      clearInterval(intervalId);
      set({ intervalId: null });
    }
  },

  getElapsed: (orderId) => get().elapsed[orderId] || 0,

  getAlertLevel: (orderId) => {
    const ms = get().elapsed[orderId] || 0;
    if (ms >= THRESHOLDS.critical) return 'critical';
    if (ms >= THRESHOLDS.warning) return 'warning';
    return 'safe';
  },
}));

export { THRESHOLDS };
export default useTimerStore;
