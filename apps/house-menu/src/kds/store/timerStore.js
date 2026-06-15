import { create } from 'zustand';
import { STATION_THRESHOLDS } from '../kdsTypes';

function calcElapsed(order, now) {
  const ts = order.statusTimestamps?.[order.status] || order.createdAt;
  if (!ts) return 0;
  return now - new Date(ts).getTime();
}

function getAlertLevelForOrder(order, elapsedMs) {
  const station = order.station || 'all';
  const thresholds = STATION_THRESHOLDS[station] || STATION_THRESHOLDS.all;
  if (elapsedMs >= thresholds.critical) return 'critical';
  if (elapsedMs >= thresholds.warning) return 'warning';
  return 'safe';
}

const useTimerStore = create((set, get) => ({
  alertLevels: {},
  elapsed: {}, // Mantenido por compatibilidad
  intervalId: null,

  recalcVisible: (visibleOrders) => {
    const now = Date.now();
    const elapsed = {};
    const alertLevels = {};
    for (const order of visibleOrders) {
      const ms = calcElapsed(order, now);
      elapsed[order.id] = ms;
      alertLevels[order.id] = getAlertLevelForOrder(order, ms);
    }
    set({ elapsed, alertLevels });
  },

  tickVisible: (visibleOrders) => {
    get().stopTicker();
    const intervalId = setInterval(() => {
      const now = Date.now();
      const currentAlerts = get().alertLevels;
      
      const elapsed = {};
      const alertLevels = {};
      let alertsChanged = false;

      for (const order of visibleOrders) {
        const ms = calcElapsed(order, now);
        elapsed[order.id] = ms;
        
        const lvl = getAlertLevelForOrder(order, ms);
        alertLevels[order.id] = lvl;

        if (currentAlerts[order.id] !== lvl) {
          alertsChanged = true;
        }
      }

      // Solo actualizamos alertLevels si realmente cambió el estado de alerta de algún pedido.
      // Esto previene re-renders innecesarios en cascada.
      set((state) => {
        const nextState = { elapsed }; // elapsed siempre se actualiza por si alguien se suscribe directamente
        if (alertsChanged || Object.keys(state.alertLevels).length !== Object.keys(alertLevels).length) {
          nextState.alertLevels = alertLevels;
        }
        return nextState;
      });
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

  getAlertLevel: (orderId) => get().alertLevels[orderId] || 'safe',
}));

export { STATION_THRESHOLDS };
export default useTimerStore;
