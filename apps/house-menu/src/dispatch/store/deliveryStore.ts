import { create } from 'zustand';
import type { DeliveryDriver } from '../../worker/workerTypes';

interface DeliveryState {
  drivers: DeliveryDriver[];
  sessionDeliveries: number;
  isLoading: boolean;
  error: string | null;
  driverFilter: 'todos' | 'disponibles' | 'en_ruta';

  setDrivers: (drivers: DeliveryDriver[]) => void;
  addDelivery: () => void;
  setError: (error: string | null) => void;
  setDriverFilter: (f: 'todos' | 'disponibles' | 'en_ruta') => void;
  reset: () => void;

  getAvailableDrivers: () => DeliveryDriver[];
  getDriversOnRoute: () => DeliveryDriver[];
  getDriversByFilter: () => DeliveryDriver[];
}

const useDeliveryStore = create<DeliveryState>()((set, get) => ({
  drivers: [],
  sessionDeliveries: 0,
  isLoading: true,
  error: null,
  driverFilter: 'todos',

  setDrivers: (drivers) => set({ drivers, isLoading: false, error: null }),
  addDelivery: () => set((s) => ({ sessionDeliveries: s.sessionDeliveries + 1 })),
  setError: (error) => set({ error }),
  setDriverFilter: (driverFilter) => set({ driverFilter }),
  reset: () => set({ drivers: [], isLoading: true, error: null, sessionDeliveries: 0 }),

  getAvailableDrivers: () => get().drivers.filter((d) => d.available !== false && d.active !== false),
  getDriversOnRoute: () => get().drivers.filter((d) => d.available === false && d.active !== false),
  getDriversByFilter: () => {
    const filter = get().driverFilter;
    if (filter === 'disponibles') return get().getAvailableDrivers();
    if (filter === 'en_ruta') return get().getDriversOnRoute();
    return get().drivers.filter((d) => d.active !== false);
  },
}));

export default useDeliveryStore;
