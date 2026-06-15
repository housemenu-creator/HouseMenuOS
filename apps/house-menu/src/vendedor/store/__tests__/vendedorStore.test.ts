import { describe, it, expect, beforeEach } from 'vitest';
import useVendedorStore from '../vendedorStore';

const mockCuenta = (overrides: Record<string, unknown> = {}) => ({
  id: 'cta-001',
  name: 'Restaurant El Faro',
  type: 'mayorista' as const,
  status: 'activa' as const,
  isActive: true,
  phone: '999888777',
  email: 'contacto@elfaro.pe',
  legalName: 'El Faro Restaurante S.A.C.',
  taxId: '20123456789',
  assignedVendedor: 'vendedor@house.local',
  creditLimit: 5000,
  creditUsed: 1200,
  paymentTerms: '30d' as const,
  lastOrderAt: Date.now() - 86400000,
  totalOrders: 15,
  totalSpent: 45000,
  createdAt: Date.now() - 86400000 * 30,
  updatedAt: Date.now() - 86400000,
  ...overrides,
});

describe('vendedorStore', () => {
  beforeEach(() => {
    useVendedorStore.getState().reset();
  });

  it('starts with empty state and loading true', () => {
    const state = useVendedorStore.getState();
    expect(state.loading).toBe(true);
    expect(state.cuentas).toHaveLength(0);
    expect(state.error).toBeNull();
    expect(state.selectedCuentaId).toBeNull();
    expect(state.searchQuery).toBe('');
    expect(state.filter).toBe('activas');
    expect(state.showNewOrder).toBe(false);
  });

  describe('applyAdd', () => {
    it('adds a cuenta', () => {
      useVendedorStore.getState().applyAdd(mockCuenta());
      const state = useVendedorStore.getState();
      expect(state.cuentas).toHaveLength(1);
      expect(state.cuentas[0].id).toBe('cta-001');
      expect(state.loading).toBe(false);
    });

    it('ignores duplicate ids', () => {
      const store = useVendedorStore.getState();
      store.applyAdd(mockCuenta());
      store.applyAdd(mockCuenta());
      expect(useVendedorStore.getState().cuentas).toHaveLength(1);
    });

    it('adds multiple cuentas', () => {
      const store = useVendedorStore.getState();
      store.applyAdd(mockCuenta());
      store.applyAdd(mockCuenta({ id: 'cta-002', name: 'Cevicheria Norte' }));
      expect(useVendedorStore.getState().cuentas).toHaveLength(2);
    });
  });

  describe('applyChange', () => {
    it('merges into an existing cuenta', () => {
      const store = useVendedorStore.getState();
      store.applyAdd(mockCuenta());
      store.applyChange({ id: 'cta-001', name: 'El Faro Renovado', creditUsed: 2500 });
      const cuenta = useVendedorStore.getState().cuentas[0];
      expect(cuenta.name).toBe('El Faro Renovado');
      expect(cuenta.creditUsed).toBe(2500);
      expect(cuenta.taxId).toBe('20123456789');
    });

    it('adds cuenta if not exists (upsert)', () => {
      useVendedorStore.getState().applyChange(mockCuenta({ id: 'cta-099' }));
      expect(useVendedorStore.getState().cuentas).toHaveLength(1);
    });
  });

  describe('applyRemove', () => {
    it('removes a cuenta by id', () => {
      const store = useVendedorStore.getState();
      store.applyAdd(mockCuenta());
      store.applyAdd(mockCuenta({ id: 'cta-002' }));
      store.applyRemove('cta-001');
      expect(useVendedorStore.getState().cuentas).toHaveLength(1);
      expect(useVendedorStore.getState().cuentas[0].id).toBe('cta-002');
    });

    it('clears selectedCuentaId when removing selected cuenta', () => {
      const store = useVendedorStore.getState();
      store.applyAdd(mockCuenta());
      store.setSelectedCuentaId('cta-001');
      store.applyRemove('cta-001');
      expect(useVendedorStore.getState().selectedCuentaId).toBeNull();
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      const store = useVendedorStore.getState();
      store.applyAdd(mockCuenta({ id: 'cta-1', name: 'Cliente A', assignedVendedor: 'vend@house.local', status: 'activa', lastOrderAt: Date.now() }));
      store.applyAdd(mockCuenta({ id: 'cta-2', name: 'Cliente B', assignedVendedor: 'vend@house.local', status: 'activa', lastOrderAt: Date.now() - 86400000 }));
      store.applyAdd(mockCuenta({ id: 'cta-3', name: 'Cliente C', assignedVendedor: 'vend@house.local', status: 'inactiva', isActive: false }));
      store.applyAdd(mockCuenta({ id: 'cta-4', name: 'Cliente D', assignedVendedor: 'otro@house.local', status: 'activa' }));
    });

    it('getCuentasByVendedor returns only cuentas for that vendedor', () => {
      const result = useVendedorStore.getState().getCuentasByVendedor('vend@house.local');
      expect(result).toHaveLength(3);
      expect(result.map((c) => c.id)).toEqual(['cta-1', 'cta-2', 'cta-3']);
    });

    it('getFilteredCuentas with filter activas returns only active cuentas for vendedor', () => {
      useVendedorStore.getState().setFilter('activas');
      const result = useVendedorStore.getState().getFilteredCuentas('vend@house.local');
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(['cta-1', 'cta-2']);
    });

    it('getFilteredCuentas with filter todas returns all cuentas for vendedor', () => {
      useVendedorStore.getState().setFilter('todas');
      const result = useVendedorStore.getState().getFilteredCuentas('vend@house.local');
      expect(result).toHaveLength(3);
    });

    it('getFilteredCuentas with search query filters by name', () => {
      useVendedorStore.getState().setFilter('todas');
      useVendedorStore.getState().setSearchQuery('Cliente B');
      const result = useVendedorStore.getState().getFilteredCuentas('vend@house.local');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cta-2');
    });

    it('getFilteredCuentas sorts by lastOrderAt descending', () => {
      useVendedorStore.getState().setFilter('todas');
      const result = useVendedorStore.getState().getFilteredCuentas('vend@house.local');
      expect(result[0].id).toBe('cta-1');
      expect(result[1].id).toBe('cta-2');
    });

    it('getSelectedCuenta returns null when nothing selected', () => {
      expect(useVendedorStore.getState().getSelectedCuenta()).toBeNull();
    });

    it('getSelectedCuenta returns selected cuenta', () => {
      useVendedorStore.getState().setSelectedCuentaId('cta-1');
      const result = useVendedorStore.getState().getSelectedCuenta();
      expect(result?.id).toBe('cta-1');
      expect(result?.name).toBe('Cliente A');
    });

    it('getActiveCuentasCount returns count of active cuentas for vendedor', () => {
      const count = useVendedorStore.getState().getActiveCuentasCount('vend@house.local');
      expect(count).toBe(2);
    });
  });

  describe('UI actions', () => {
    it('setSelectedCuentaId updates selectedCuentaId', () => {
      useVendedorStore.getState().setSelectedCuentaId('cta-001');
      expect(useVendedorStore.getState().selectedCuentaId).toBe('cta-001');
    });

    it('setSearchQuery updates searchQuery', () => {
      useVendedorStore.getState().setSearchQuery('busqueda');
      expect(useVendedorStore.getState().searchQuery).toBe('busqueda');
    });

    it('setFilter updates filter', () => {
      useVendedorStore.getState().setFilter('todas');
      expect(useVendedorStore.getState().filter).toBe('todas');
    });

    it('setShowNewOrder toggles showNewOrder', () => {
      useVendedorStore.getState().setShowNewOrder(true);
      expect(useVendedorStore.getState().showNewOrder).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      const store = useVendedorStore.getState();
      store.applyAdd(mockCuenta());
      store.setSelectedCuentaId('cta-001');
      store.setSearchQuery('test');
      store.setFilter('todas');
      store.setShowNewOrder(true);
      store.reset();
      const state = useVendedorStore.getState();
      expect(state.cuentas).toHaveLength(0);
      expect(state.loading).toBe(true);
      expect(state.selectedCuentaId).toBeNull();
      expect(state.searchQuery).toBe('');
      expect(state.filter).toBe('activas');
      expect(state.showNewOrder).toBe(false);
    });
  });
});
