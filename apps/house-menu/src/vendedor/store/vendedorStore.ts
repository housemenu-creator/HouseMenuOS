import { create } from 'zustand';
import type { VendedorCuenta, CuentaFilter } from '../vendedorTypes';

interface VendedorStore {
  cuentas: VendedorCuenta[];
  loading: boolean;
  error: string | null;

  selectedCuentaId: string | null;
  searchQuery: string;
  filter: CuentaFilter;
  showNewOrder: boolean;

  applyAdd: (raw: Record<string, unknown> & { id: string }) => void;
  applyChange: (raw: Partial<VendedorCuenta> & { id: string }) => void;
  applyRemove: (id: string) => void;
  reset: () => void;

  setSelectedCuentaId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setFilter: (f: CuentaFilter) => void;
  setShowNewOrder: (v: boolean) => void;

  getCuentasByVendedor: (vendedorEmail: string) => VendedorCuenta[];
  getFilteredCuentas: (vendedorEmail: string) => VendedorCuenta[];
  getSelectedCuenta: () => VendedorCuenta | null;
  getActiveCuentasCount: (vendedorEmail: string) => number;
}

const useVendedorStore = create<VendedorStore>()((set, get) => ({
  cuentas: [],
  loading: true,
  error: null,

  selectedCuentaId: null,
  searchQuery: '',
  filter: 'activas',
  showNewOrder: false,

  applyAdd: (raw) => {
    set((state) => {
      if (state.cuentas.some((c) => c.id === raw.id)) return state;
      return { cuentas: [...state.cuentas, raw as unknown as VendedorCuenta], loading: false };
    });
  },

  applyChange: (raw) => {
    set((state) => {
      const cuentas = state.cuentas.map((c) =>
        c.id === raw.id ? { ...c, ...raw } : c
      );
      if (cuentas.length === state.cuentas.length && !state.cuentas.some((c) => c.id === raw.id)) {
        cuentas.push(raw as unknown as VendedorCuenta);
      }
      return { cuentas };
    });
  },

  applyRemove: (id) => {
    set((state) => ({
      cuentas: state.cuentas.filter((c) => c.id !== id),
      selectedCuentaId: state.selectedCuentaId === id ? null : state.selectedCuentaId,
    }));
  },

  reset: () => set({
    cuentas: [],
    loading: true,
    error: null,
    selectedCuentaId: null,
    searchQuery: '',
    filter: 'activas',
    showNewOrder: false,
  }),

  setSelectedCuentaId: (id) => set({ selectedCuentaId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilter: (f) => set({ filter: f }),
  setShowNewOrder: (v) => set({ showNewOrder: v }),

  getCuentasByVendedor: (vendedorEmail) => {
    return get().cuentas.filter((c) => c.assignedVendedor === vendedorEmail);
  },

  getFilteredCuentas: (vendedorEmail) => {
    let result = get().cuentas.filter((c) => c.assignedVendedor === vendedorEmail);

    const filter = get().filter;
    if (filter === 'activas') {
      result = result.filter((c) => c.status === 'activa' && c.isActive !== false);
    } else if (filter === 'pendientes') {
      result = result.filter((c) => c.status === 'activa' && c.creditUsed != null && c.creditLimit != null && c.creditUsed >= c.creditLimit * 0.8);
    }

    const q = get().searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.legalName || '').toLowerCase().includes(q) ||
          (c.taxId || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => (b.lastOrderAt || b.createdAt) - (a.lastOrderAt || a.createdAt));
  },

  getSelectedCuenta: () => {
    const { cuentas, selectedCuentaId } = get();
    return cuentas.find((c) => c.id === selectedCuentaId) || null;
  },

  getActiveCuentasCount: (vendedorEmail) => {
    return get().cuentas.filter(
      (c) => c.assignedVendedor === vendedorEmail && c.status === 'activa' && c.isActive !== false
    ).length;
  },
}));

export default useVendedorStore;
