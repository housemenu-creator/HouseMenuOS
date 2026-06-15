import { create } from 'zustand';

const STORAGE_KEY = 'house-delivery-session';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function persist(state: Partial<DeliverySessionState>) {
  try {
    const existing = loadPersisted();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...state }));
  } catch { /* ignore */ }
}

interface DeliverySessionState {
  driverId: string | null;
  driverName: string | null;
  isAvailable: boolean;
  activeDeliveries: number;
  completedDeliveries: number;

  setDriver: (id: string, name: string) => void;
  setAvailability: (v: boolean) => void;
  incrementCompleted: () => void;
  reset: () => void;
}

const persisted = loadPersisted();

const useDeliverySessionStore = create<DeliverySessionState>()((set) => ({
  driverId: persisted.driverId ?? null,
  driverName: persisted.driverName ?? null,
  isAvailable: persisted.isAvailable ?? true,
  activeDeliveries: persisted.activeDeliveries ?? 0,
  completedDeliveries: persisted.completedDeliveries ?? 0,

  setDriver: (id, name) => {
    set({ driverId: id, driverName: name });
    persist({ driverId: id, driverName: name });
  },
  setAvailability: (v) => {
    set({ isAvailable: v });
    persist({ isAvailable: v });
  },
  incrementCompleted: () =>
    set((s) => {
      const completedDeliveries = s.completedDeliveries + 1;
      persist({ completedDeliveries });
      return { completedDeliveries };
    }),
  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ driverId: null, driverName: null, isAvailable: true, activeDeliveries: 0, completedDeliveries: 0 });
  },
}));

export default useDeliverySessionStore;
