import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LogisticsTab from '../LogisticsTab';

// ── Hoisted mocks ──
const { mocks } = vi.hoisted(() => ({
  mocks: {
    subscribeIngredients: vi.fn(),
    createIngredient: vi.fn(),
    updateIngredient: vi.fn(),
    deleteIngredient: vi.fn(),
    subscribeRecipes: vi.fn(),
    createRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    subscribeSuppliers: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    deleteSupplier: vi.fn(),
    subscribePurchaseOrders: vi.fn(),
    createPurchaseOrder: vi.fn(),
    receivePurchaseOrder: vi.fn(),
    cancelPurchaseOrder: vi.fn(),
    subscribeMovements: vi.fn(),
    registerMovement: vi.fn(),
    subscribeCOGS: vi.fn(),
    fbRef: vi.fn(),
    fbOnValue: vi.fn(),
  },
}));

// ── Context mocks ──
vi.mock('../../../context/BranchContext', () => ({
  useBranch: () => ({ activeBranchId: 'branch-1' }),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'admin@house.com' } }),
}));

// ── Firebase DB mock ──
vi.mock('@house/db', () => ({ realtimeDB: {} }));

vi.mock('firebase/database', () => ({
  ref: mocks.fbRef,
  onValue: mocks.fbOnValue,
}));

// ── Logistics service mock ──
vi.mock('../../../lib/logisticsService', () => ({
  subscribeIngredients: mocks.subscribeIngredients,
  createIngredient: mocks.createIngredient,
  updateIngredient: mocks.updateIngredient,
  deleteIngredient: mocks.deleteIngredient,
  subscribeRecipes: mocks.subscribeRecipes,
  createRecipe: mocks.createRecipe,
  updateRecipe: mocks.updateRecipe,
  deleteRecipe: mocks.deleteRecipe,
  subscribeSuppliers: mocks.subscribeSuppliers,
  createSupplier: mocks.createSupplier,
  updateSupplier: mocks.updateSupplier,
  deleteSupplier: mocks.deleteSupplier,
  subscribePurchaseOrders: mocks.subscribePurchaseOrders,
  createPurchaseOrder: mocks.createPurchaseOrder,
  receivePurchaseOrder: mocks.receivePurchaseOrder,
  cancelPurchaseOrder: mocks.cancelPurchaseOrder,
  subscribeMovements: mocks.subscribeMovements,
  registerMovement: mocks.registerMovement,
  subscribeCOGS: mocks.subscribeCOGS,
}));

// ── Test data ──
const mockIngredients = [
  { id: 'ing-1', name: 'Papa', unit: 'kg', stock: 50, minStock: 10, cost: 2.5, supplierId: '' },
  { id: 'ing-2', name: 'Cebolla', unit: 'kg', stock: 3, minStock: 5, cost: 1.8, supplierId: '' },
  { id: 'ing-3', name: 'Aceite', unit: 'litro', stock: 20, minStock: 4, cost: 8.0, supplierId: '' },
];

const mockSuppliers = [
  { id: 'sup-1', name: 'Distribuidora Norte', contact: 'Juan', phone: '999-111-222', email: 'juan@norte.com', notes: 'Entrega martes' },
  { id: 'sup-2', name: 'Carnes Premium', contact: 'Maria', phone: '999-333-444', email: '', notes: '' },
];

/* ──────────────────────────────
 * Default subscribe impl
 * ────────────────────────────── */

function defaultSubs() {
  mocks.subscribeIngredients.mockReturnValue(() => {});
  mocks.subscribeRecipes.mockReturnValue(() => {});
  mocks.subscribeSuppliers.mockReturnValue(() => {});
  mocks.subscribePurchaseOrders.mockReturnValue(() => {});
  mocks.subscribeMovements.mockReturnValue(() => {});
  mocks.subscribeCOGS.mockReturnValue(() => {});
  mocks.fbOnValue.mockImplementation((_ref, cb) => { cb({ val: () => null }); return () => {}; });
}

/* ──────────────────────────────
 * LogisticsTab — navigation
 * ────────────────────────────── */

describe('LogisticsTab', () => {
  beforeEach(() => { vi.clearAllMocks(); defaultSubs(); });

  it('renders header and all 6 section nav buttons', () => {
    render(<LogisticsTab />);
    expect(screen.getByText('Logística')).toBeDefined();
    for (const label of ['Insumos', 'Recetas', 'Kardex', 'Proveedores', 'Compras', 'COGS']) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });

  it('defaults to Insumos section', () => {
    render(<LogisticsTab />);
    expect(screen.getByText('Nuevo insumo')).toBeDefined();
  });

  it('switches between sections via nav buttons', async () => {
    mocks.subscribeRecipes.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeSuppliers.mockImplementation((_b, cb) => { cb(mockSuppliers); return () => {}; });
    mocks.subscribeCOGS.mockImplementation((_b, cb) => { cb({}); return () => {}; });

    render(<LogisticsTab />);

    // → Recetas
    fireEvent.click(screen.getByText('Recetas'));
    await waitFor(() => { expect(screen.getByText(/0 receta/)).toBeDefined(); });

    // → Proveedores
    fireEvent.click(screen.getByText('Proveedores'));
    await waitFor(() => { expect(screen.getByText('Distribuidora Norte')).toBeDefined(); });

    // → COGS
    fireEvent.click(screen.getByText('COGS'));
    await waitFor(() => { expect(screen.getByText('Productos con receta')).toBeDefined(); });

    // Back to Insumos
    fireEvent.click(screen.getByText('Insumos'));
    await waitFor(() => { expect(screen.getByText('Nuevo insumo')).toBeDefined(); });
  });
});

/* ──────────────────────────────
 * IngredientsSection
 * ────────────────────────────── */

describe('IngredientsSection', () => {
  beforeEach(() => { vi.clearAllMocks(); defaultSubs(); });

  it('renders ingredient table with stock and low-stock warning', async () => {
    mocks.subscribeIngredients.mockImplementation((_b, cb) => { cb(mockIngredients); return () => {}; });
    render(<LogisticsTab />);

    await waitFor(() => { expect(screen.getByText('Papa')).toBeDefined(); });
    expect(screen.getByText('Cebolla')).toBeDefined();
    expect(screen.getByText('Aceite')).toBeDefined();
    expect(screen.getByText('50')).toBeDefined();
    expect(screen.getByText('20')).toBeDefined();
    // Cebolla: stock 3 < min 5 → 1 low-stock
    expect(screen.getByText(/1 con stock bajo/)).toBeDefined();
  });

  it('filters ingredients by search', async () => {
    mocks.subscribeIngredients.mockImplementation((_b, cb) => { cb(mockIngredients); return () => {}; });
    render(<LogisticsTab />);
    await waitFor(() => { expect(screen.getByText('Papa')).toBeDefined(); });

    fireEvent.change(screen.getByPlaceholderText('Buscar insumo...'), { target: { value: 'ceb' } });

    await waitFor(() => { expect(screen.getByText('Cebolla')).toBeDefined(); });
    expect(screen.queryByText('Papa')).toBeNull();
    expect(screen.queryByText('Aceite')).toBeNull();
  });

  it('creates a new ingredient via form', async () => {
    mocks.subscribeIngredients.mockImplementation((_b, cb) => { cb(mockIngredients); return () => {}; });
    mocks.createIngredient.mockResolvedValue({ success: true });
    render(<LogisticsTab />);

    fireEvent.click(screen.getByText('Nuevo insumo'));
    await waitFor(() => { expect(screen.getByPlaceholderText('Nombre del insumo')).toBeDefined(); });

    fireEvent.change(screen.getByPlaceholderText('Nombre del insumo'), { target: { value: 'Sal' } });
    fireEvent.change(screen.getByPlaceholderText('Stock actual'), { target: { value: '100' } });
    fireEvent.change(screen.getByPlaceholderText('Stock mínimo'), { target: { value: '10' } });
    fireEvent.change(screen.getAllByPlaceholderText('Costo x unidad')[0], { target: { value: '0.5' } });
    fireEvent.click(screen.getByText('Crear'));

    await waitFor(() => {
      expect(mocks.createIngredient).toHaveBeenCalledWith('branch-1', {
        name: 'Sal', unit: 'kg', stock: '100', minStock: '10', cost: '0.5', supplierId: '',
      });
    });
  });

  it('closes form on cancel', async () => {
    mocks.subscribeIngredients.mockImplementation((_b, cb) => { cb(mockIngredients); return () => {}; });
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Nuevo insumo'));
    await waitFor(() => { expect(screen.getByPlaceholderText('Nombre del insumo')).toBeDefined(); });
    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => { expect(screen.queryByPlaceholderText('Nombre del insumo')).toBeNull(); });
  });

  it('does not save when name is empty', async () => {
    mocks.subscribeIngredients.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Nuevo insumo'));
    await waitFor(() => { expect(screen.getByText('Crear')).toBeDefined(); });
    fireEvent.click(screen.getByText('Crear'));
    // Should not call createIngredient (early return on line 83)
    expect(mocks.createIngredient).not.toHaveBeenCalled();
  });
});

/* ──────────────────────────────
 * SuppliersSection
 * ────────────────────────────── */

describe('SuppliersSection', () => {
  beforeEach(() => { vi.clearAllMocks(); defaultSubs(); });

  it('renders supplier cards with contact info', async () => {
    mocks.subscribeSuppliers.mockImplementation((_b, cb) => { cb(mockSuppliers); return () => {}; });
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Proveedores'));

    await waitFor(() => { expect(screen.getByText('Distribuidora Norte')).toBeDefined(); });
    expect(screen.getByText('Carnes Premium')).toBeDefined();
    expect(screen.getByText(/Entrega martes/)).toBeDefined();
  });

  it('creates a new supplier via form', async () => {
    mocks.subscribeSuppliers.mockImplementation((_b, cb) => { cb(mockSuppliers); return () => {}; });
    mocks.createSupplier.mockResolvedValue({ success: true });
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Proveedores'));
    await waitFor(() => { expect(screen.getByText('Distribuidora Norte')).toBeDefined(); });

    fireEvent.click(screen.getByText('Nuevo proveedor'));
    await waitFor(() => { expect(screen.getByPlaceholderText('Nombre')).toBeDefined(); });

    fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Nuevo Prov' } });
    fireEvent.change(screen.getByPlaceholderText('Contacto'), { target: { value: 'Pedro' } });
    fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { value: '999-555-666' } });
    fireEvent.click(screen.getByText('Crear'));

    await waitFor(() => {
      expect(mocks.createSupplier).toHaveBeenCalledWith('branch-1', {
        name: 'Nuevo Prov', contact: 'Pedro', phone: '999-555-666', email: '', notes: '',
      });
    });
  });

  it('does not create supplier when name is empty', async () => {
    mocks.subscribeSuppliers.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Proveedores'));
    await waitFor(() => { expect(screen.getByText('Nuevo proveedor')).toBeDefined(); });
    fireEvent.click(screen.getByText('Nuevo proveedor'));
    await waitFor(() => { expect(screen.getByText('Crear')).toBeDefined(); });
    fireEvent.click(screen.getByText('Crear'));
    expect(mocks.createSupplier).not.toHaveBeenCalled();
  });
});
