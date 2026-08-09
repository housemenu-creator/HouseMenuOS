import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import LogisticsTab from '../LogisticsTab';

// ── Hoisted mocks ──
const { mocks } = vi.hoisted(() => ({
  mocks: {
    subscribeIngredients: vi.fn((_b, cb) => { cb([]); return () => {}; }),
    createIngredient: vi.fn(),
    updateIngredient: vi.fn(),
    deleteIngredient: vi.fn(),
    subscribeRecipes: vi.fn((_b, cb) => { cb([]); return () => {}; }),
    createRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    subscribeSuppliers: vi.fn((_b, cb) => { cb([]); return () => {}; }),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    deleteSupplier: vi.fn(),
    subscribeCategories: vi.fn((_b, cb) => { cb([]); return () => {}; }),
    createCategory: vi.fn(),
    renameCategory: vi.fn(),
    deleteCategory: vi.fn(),
    subscribePurchaseOrders: vi.fn((_b, cb) => { cb([]); return () => {}; }),
    createPurchaseOrder: vi.fn(),
    receivePurchaseOrder: vi.fn(),
    cancelPurchaseOrder: vi.fn(),
    subscribeMovements: vi.fn((_b, cb) => { cb([]); return () => {}; }),
    registerMovement: vi.fn(),
    subscribeCOGS: vi.fn((_b, cb) => { cb({}); return () => {}; }),
    fbRef: vi.fn((_db, _path) => ({})),
    fbOnValue: vi.fn((_ref, cb) => { cb({ val: () => null }); return () => {}; }),
  },
}));

// ── Context mocks ──
vi.mock('../../../context/BranchContext', () => ({
  useBranch: () => ({ activeBranchId: 'branch-1' }),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'admin@house.com' } }),
}));

// ── Framermotion mock (avoid AnimatePresence delays in jsdom) ──
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div>, button: ({ children, ...p }) => <button {...p}>{children}</button> },
  AnimatePresence: ({ children }) => <>{children}</>,
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
  subscribeCategories: mocks.subscribeCategories,
  createCategory: mocks.createCategory,
  renameCategory: mocks.renameCategory,
  deleteCategory: mocks.deleteCategory,
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
  { id: 'ing-1', name: 'Papa', unit: 'kg', stock: 50, minStock: 10, cost: 2.5, supplierIds: [], categories: [] },
  { id: 'ing-2', name: 'Cebolla', unit: 'kg', stock: 3, minStock: 5, cost: 1.8, supplierIds: [], categories: [] },
  { id: 'ing-3', name: 'Aceite', unit: 'litro', stock: 20, minStock: 4, cost: 8.0, supplierIds: [], categories: [] },
];

const mockSuppliers = [
  { id: 'sup-1', name: 'Distribuidora Norte', contact: 'Juan', phone: '999-111-222', email: 'juan@norte.com', notes: 'Entrega martes' },
  { id: 'sup-2', name: 'Carnes Premium', contact: 'Maria', phone: '999-333-444', email: '', notes: '' },
];

/* ──────────────────────────────
 * LogisticsTab — navigation
 * ────────────────────────────── */

describe('LogisticsTab', () => {
  beforeEach(() => {
    // Don't use vi.clearAllMocks — it resets implementations in vitest 4.x
    // Just clear call history on the mocks used in these tests
    mocks.subscribeIngredients.mockClear();
    mocks.subscribeRecipes.mockClear();
    mocks.subscribeSuppliers.mockClear();
    mocks.subscribePurchaseOrders.mockClear();
    mocks.subscribeMovements.mockClear();
    mocks.subscribeCOGS.mockClear();
    mocks.fbOnValue.mockClear();
    mocks.createIngredient.mockClear();
    mocks.createSupplier.mockClear();
  });

  it('renders header and all 6 section nav buttons', () => {
    render(<LogisticsTab />);
    expect(screen.getByText('Logística')).toBeDefined();
    for (const label of ['Insumos', 'Recetas', 'Kardex', 'Proveedores', 'Compras', 'COGS']) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });

  it('defaults to Insumos section', () => {
    mocks.subscribeIngredients.mockImplementation((_b, cb) => { cb(mockIngredients); return () => {}; });
    render(<LogisticsTab />);
    expect(screen.getByText('Nuevo insumo')).toBeDefined();
  });

  it('switches between sections via nav buttons', async () => {
    mocks.subscribeIngredients.mockImplementation((_b, cb) => { cb(mockIngredients); return () => {}; });
    mocks.subscribeRecipes.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeSuppliers.mockImplementation((_b, cb) => { cb(mockSuppliers); return () => {}; });
    mocks.subscribeCOGS.mockImplementation((_b, cb) => { cb({}); return () => {}; });
    mocks.fbOnValue.mockImplementation((_ref, cb) => { cb({ val: () => ({ p1: { name: 'Prod 1' } }) }); return () => {}; });

    render(<LogisticsTab />);

    // → Recetas
    await act(async () => { fireEvent.click(screen.getByText('Recetas')); });

    // Recetas section loads in real time via subscriptions
    await waitFor(() => { expect(screen.getByText('Nueva receta')).toBeDefined(); });

    // → Proveedores
    fireEvent.click(screen.getByText('Proveedores'));
    await waitFor(() => { expect(screen.getByText('Distribuidora Norte')).toBeDefined(); });

    // → COGS
    fireEvent.click(screen.getByText('COGS'));
    await waitFor(() => { expect(screen.getByText('Con receta')).toBeDefined(); });

    // Back to Insumos
    fireEvent.click(screen.getByText('Insumos'));
    await waitFor(() => { expect(screen.getByText('Nuevo insumo')).toBeDefined(); });
  });
});

/* ──────────────────────────────
 * IngredientsSection
 * ────────────────────────────── */

describe('IngredientsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscribeIngredients.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeRecipes.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeSuppliers.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribePurchaseOrders.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeMovements.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeCOGS.mockImplementation((_b, cb) => { cb({}); return () => {}; });
    mocks.fbOnValue.mockImplementation((_ref, cb) => { cb({ val: () => null }); return () => {}; });
  });

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
    await waitFor(() => { expect(screen.getByLabelText(/Nombre/)).toBeDefined(); });

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Sal' } });
    fireEvent.change(screen.getByLabelText(/Stock inicial/), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Stock mínimo/), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Costo x unidad/), { target: { value: '0.5' } });
    fireEvent.click(screen.getByText('Crear'));

    await waitFor(() => {
      expect(mocks.createIngredient).toHaveBeenCalledWith('branch-1', expect.objectContaining({
        name: 'Sal', unit: 'kg', stock: '100', minStock: '10', cost: '0.5', supplierIds: [], categories: [],
      }), 'admin@house.com');
    });
  });

  it('closes form on cancel', async () => {
    mocks.subscribeIngredients.mockImplementation((_b, cb) => { cb(mockIngredients); return () => {}; });
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Nuevo insumo'));
    await waitFor(() => { expect(screen.getByLabelText(/Nombre/)).toBeDefined(); });
    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => { expect(screen.queryByLabelText(/Nombre/)).toBeNull(); });
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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscribeIngredients.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeRecipes.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeSuppliers.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribePurchaseOrders.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeMovements.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeCOGS.mockImplementation((_b, cb) => { cb({}); return () => {}; });
    mocks.fbOnValue.mockImplementation((_ref, cb) => { cb({ val: () => null }); return () => {}; });
  });

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
    await waitFor(() => { expect(screen.getByPlaceholderText('Nombre *')).toBeDefined(); });

    fireEvent.change(screen.getByPlaceholderText('Nombre *'), { target: { value: 'Nuevo Prov' } });
    fireEvent.change(screen.getByPlaceholderText('Contacto'), { target: { value: 'Pedro' } });
    fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { value: '999-555-666' } });
    fireEvent.click(screen.getByText('Crear'));

    await waitFor(() => {
      expect(mocks.createSupplier).toHaveBeenCalledWith('branch-1', expect.objectContaining({
        name: 'Nuevo Prov', contacto: 'Pedro', telefono: '999-555-666',
      }), 'admin@house.com');
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

/* ──────────────────────────────
 * PurchaseOrdersSection — order form
 * ────────────────────────────── */

describe('PurchaseOrdersSection', () => {
  const ingPapa = { id: 'ing-papa', name: 'Papa', unit: 'kg', stock: 2, minStock: 10, cost: 2.5, supplierIds: ['sup-1'], categories: [] };
  const ingCarne = { id: 'ing-carne', name: 'Carne', unit: 'kg', stock: 1, minStock: 5, cost: 15, supplierIds: ['sup-2'], categories: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscribeIngredients.mockImplementation((_b, cb) => { cb([ingPapa, ingCarne]); return () => {}; });
    mocks.subscribeRecipes.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeSuppliers.mockImplementation((_b, cb) => { cb(mockSuppliers); return () => {}; });
    mocks.subscribePurchaseOrders.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeMovements.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeCOGS.mockImplementation((_b, cb) => { cb({}); return () => {}; });
    mocks.createPurchaseOrder.mockResolvedValue({ success: true });
  });

  it('filters ingredients by selected supplier and creates one order per supplier', async () => {
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Compras'));
    await waitFor(() => { expect(screen.getByText('Nueva orden')).toBeDefined(); });
    fireEvent.click(screen.getByText('Nueva orden'));

    // Seleccionar proveedor sup-1 → solo sus insumos (Papa sí, Carne no)
    await waitFor(() => { expect(screen.getByRole('combobox')).toBeDefined(); });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sup-1' } });
    await waitFor(() => { expect(screen.getByText('Papa')).toBeDefined(); });
    expect(screen.queryByText('Carne')).toBeNull();

    // Toggle "ver todos" → aparece Carne (de otro proveedor)
    fireEvent.click(screen.getByText('Solo de Distribuidora Norte'));
    await waitFor(() => { expect(screen.getByText('Carne')).toBeDefined(); });

    // Agregar ambos a la orden
    const addBtns = screen.getAllByRole('button', { name: 'Agregar' });
    expect(addBtns.length).toBe(2);
    fireEvent.click(addBtns[0]);
    fireEvent.click(addBtns[1]);
    await waitFor(() => { expect(screen.getByText(/En la orden \(2 insumos\)/)).toBeDefined(); });

    // Crear → una OC por proveedor
    fireEvent.click(screen.getByText('Crear orden'));
    await waitFor(() => {
      expect(mocks.createPurchaseOrder).toHaveBeenCalledTimes(2);
    });
    expect(mocks.createPurchaseOrder).toHaveBeenCalledWith('branch-1', expect.objectContaining({
      supplierId: 'sup-1',
      supplierName: 'Distribuidora Norte',
      items: expect.arrayContaining([expect.objectContaining({ ingredientId: 'ing-papa', quantity: 8 })]),
    }), 'admin@house.com');
    expect(mocks.createPurchaseOrder).toHaveBeenCalledWith('branch-1', expect.objectContaining({
      supplierId: 'sup-2',
      supplierName: 'Carnes Premium',
      items: expect.arrayContaining([expect.objectContaining({ ingredientId: 'ing-carne', quantity: 4 })]),
    }), 'admin@house.com');
  });

  it('creates a new ingredient from the order form and adds it to the cart', async () => {
    mocks.createIngredient.mockResolvedValue({ success: true, id: 'ing-nuevo' });
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Compras'));
    await waitFor(() => { expect(screen.getByText('Nueva orden')).toBeDefined(); });
    fireEvent.click(screen.getByText('Nueva orden'));

    await waitFor(() => { expect(screen.getByRole('combobox')).toBeDefined(); });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sup-1' } });
    await waitFor(() => { expect(screen.getByText('Papa')).toBeDefined(); });

    // Abrir panel rápido y crear
    fireEvent.click(screen.getByText('Nuevo insumo'));
    await waitFor(() => { expect(screen.getByPlaceholderText('Ej: Tomate')).toBeDefined(); });
    fireEvent.change(screen.getByPlaceholderText('Ej: Tomate'), { target: { value: 'Tomate' } });
    fireEvent.change(screen.getByPlaceholderText('Cantidad'), { target: { value: '5' } });
    fireEvent.click(screen.getByText('Crear y agregar'));

    await waitFor(() => {
      expect(mocks.createIngredient).toHaveBeenCalledWith('branch-1', expect.objectContaining({
        name: 'Tomate', unit: 'kg', supplierIds: ['sup-1'],
      }), 'admin@house.com');
    });

    // El insumo quedó en el carrito de la orden
    await waitFor(() => { expect(screen.getByText(/En la orden \(1 insumo\)/)).toBeDefined(); });
    expect(screen.getByText('Tomate')).toBeDefined();
  });

  it('resalta la fila activa y navega con Enter entre filas (Excel-like)', async () => {
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Compras'));
    await waitFor(() => { expect(screen.getByText('Nueva orden')).toBeDefined(); });
    fireEvent.click(screen.getByText('Nueva orden'));

    await waitFor(() => { expect(screen.getByRole('combobox')).toBeDefined(); });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sup-1' } });
    await waitFor(() => { expect(screen.getByText('Papa')).toBeDefined(); });

    // Ver todos → 2 filas (Papa y Carne)
    fireEvent.click(screen.getByText('Solo de Distribuidora Norte'));
    await waitFor(() => { expect(screen.getByText('Carne')).toBeDefined(); });

    // Inputs de cantidad (step=1, los de costo son step=0.01)
    const qtyInputs = screen.getAllByRole('spinbutton').filter(el => el.step === '1');
    expect(qtyInputs.length).toBe(2);

    // Focus en el primero → su fila se resalta
    fireEvent.focus(qtyInputs[0]);
    const papaRow = qtyInputs[0].closest('tr');
    expect(papaRow.className).toContain('bg-cm-accent/10');

    // Enter → el foco baja al input de cantidad de la siguiente fila
    fireEvent.keyDown(qtyInputs[0], { key: 'Enter' });
    await waitFor(() => { expect(document.activeElement).toBe(qtyInputs[1]); });

    // Shift+Enter → sube a la fila anterior
    fireEvent.keyDown(qtyInputs[1], { key: 'Enter', shiftKey: true });
    await waitFor(() => { expect(document.activeElement).toBe(qtyInputs[0]); });
  });

  it('ordena por Falta (deficit) al hacer click en el header', async () => {
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Compras'));
    await waitFor(() => { expect(screen.getByText('Nueva orden')).toBeDefined(); });
    fireEvent.click(screen.getByText('Nueva orden'));

    await waitFor(() => { expect(screen.getByRole('combobox')).toBeDefined(); });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sup-1' } });
    await waitFor(() => { expect(screen.getByText('Papa')).toBeDefined(); });

    // Ver todos → 2 filas (Papa deficit=8, Carne deficit=4)
    fireEvent.click(screen.getByText('Solo de Distribuidora Norte'));
    await waitFor(() => { expect(screen.getByText('Carne')).toBeDefined(); });

    // click en Falta (asc) → primero Carne (4), luego Papa (8)
    fireEvent.click(screen.getByText('Falta'));
    const names = () => Array.from(document.querySelectorAll('tbody tr')).map(tr => tr.querySelector('td')?.textContent || '');
    await waitFor(() => {
      const order = names();
      expect(order[0]).toContain('Carne');
      expect(order[1]).toContain('Papa');
    });

    // segundo click → desc: Papa primero
    fireEvent.click(screen.getByText('Falta'));
    await waitFor(() => {
      const order = names();
      expect(order[0]).toContain('Papa');
      expect(order[1]).toContain('Carne');
    });
  });

  it('distribuye cantidades pegadas desde Excel fila a fila', async () => {
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Compras'));
    await waitFor(() => { expect(screen.getByText('Nueva orden')).toBeDefined(); });
    fireEvent.click(screen.getByText('Nueva orden'));

    await waitFor(() => { expect(screen.getByRole('combobox')).toBeDefined(); });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sup-1' } });
    await waitFor(() => { expect(screen.getByText('Papa')).toBeDefined(); });

    // Ver todos → 2 filas (Papa y Carne)
    fireEvent.click(screen.getByText('Solo de Distribuidora Norte'));
    await waitFor(() => { expect(screen.getByText('Carne')).toBeDefined(); });

    const qtyInputs = screen.getAllByRole('spinbutton').filter(el => el.step === '1');
    // Pegar dos cantidades en la primera fila → se distribuyen en orden
    fireEvent.paste(qtyInputs[0], { clipboardData: { getData: () => '12\n8' } });
    await waitFor(() => {
      expect(qtyInputs[0].value).toBe('12');
      expect(qtyInputs[1].value).toBe('8');
    });

    // Agregar ambas → carrito con las cantidades pegadas
    const addBtns = screen.getAllByRole('button', { name: 'Agregar' });
    fireEvent.click(addBtns[0]);
    fireEvent.click(addBtns[1]);
    await waitFor(() => { expect(screen.getByText(/En la orden \(2 insumos\)/)).toBeDefined(); });

    fireEvent.click(screen.getByText('Crear orden'));
    await waitFor(() => {
      expect(mocks.createPurchaseOrder).toHaveBeenCalledTimes(2);
    });
    // Orden alfabético: Carne primero, Papa después → 12 va a Carne, 8 a Papa
    expect(mocks.createPurchaseOrder).toHaveBeenCalledWith('branch-1', expect.objectContaining({
      supplierId: 'sup-2',
      items: expect.arrayContaining([expect.objectContaining({ ingredientId: 'ing-carne', quantity: 12 })]),
    }), 'admin@house.com');
    expect(mocks.createPurchaseOrder).toHaveBeenCalledWith('branch-1', expect.objectContaining({
      supplierId: 'sup-1',
      items: expect.arrayContaining([expect.objectContaining({ ingredientId: 'ing-papa', quantity: 8 })]),
    }), 'admin@house.com');
  });

  it('recibe una orden confirmando cantidades editadas (recepción real)', async () => {
    mocks.receivePurchaseOrder.mockResolvedValue({ success: true, priceChanges: [] });
    mocks.subscribePurchaseOrders.mockImplementation((_b, cb) => {
      cb([{
        id: 'po-1',
        supplierId: 'sup-1',
        supplierName: 'Distribuidora Norte',
        status: 'pendiente',
        orderedAt: '2026-08-08T10:00:00.000Z',
        total: 30,
        items: {
          'ing-papa': { ingredientId: 'ing-papa', name: 'Papa', quantity: 10, unit: 'kg', unitCost: 2 },
          'ing-carne': { ingredientId: 'ing-carne', name: 'Carne', quantity: 5, unit: 'kg', unitCost: 2 },
        },
      }]);
      return () => {};
    });
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Compras'));
    await waitFor(() => { expect(screen.getByText('Distribuidora Norte')).toBeDefined(); });

    fireEvent.click(screen.getByText('Recibir'));
    await waitFor(() => { expect(screen.getByText('Confirmar recepción')).toBeDefined(); });

    // Editar: Papa se recibe 8 (no 10), Carne se recibe completo
    const qtyInputs = screen.getAllByRole('spinbutton');
    expect(qtyInputs.length).toBe(2);
    fireEvent.change(qtyInputs[0], { target: { value: '8' } });

    fireEvent.click(screen.getByText('Confirmar recepción'));
    await waitFor(() => {
      expect(mocks.receivePurchaseOrder).toHaveBeenCalledWith('branch-1', 'po-1', 'admin@house.com', { 'ing-papa': 8, 'ing-carne': 5 });
    });
    // El modal se cierra
    await waitFor(() => { expect(screen.queryByText('Confirmar recepción')).toBeNull(); });
  });

  it('muestra el error cuando la recepción falla (ej: ya recibida por otro lado)', async () => {
    mocks.receivePurchaseOrder.mockResolvedValue({ success: false, error: 'Orden no encontrada o ya recibida' });
    mocks.subscribePurchaseOrders.mockImplementation((_b, cb) => {
      cb([{
        id: 'po-2',
        supplierId: 'sup-1',
        supplierName: 'Distribuidora Norte',
        status: 'pendiente',
        orderedAt: '2026-08-08T10:00:00.000Z',
        total: 20,
        items: {
          'ing-papa': { ingredientId: 'ing-papa', name: 'Papa', quantity: 10, unit: 'kg', unitCost: 2 },
        },
      }]);
      return () => {};
    });
    render(<LogisticsTab />);
    fireEvent.click(screen.getByText('Compras'));
    await waitFor(() => { expect(screen.getByText('Distribuidora Norte')).toBeDefined(); });

    fireEvent.click(screen.getByText('Recibir'));
    await waitFor(() => { expect(screen.getByText('Confirmar recepción')).toBeDefined(); });
    fireEvent.click(screen.getByText('Confirmar recepción'));

    // El error se muestra y el modal queda abierto para reintentar
    await waitFor(() => { expect(screen.getByText('Orden no encontrada o ya recibida')).toBeDefined(); });
    expect(screen.getByText('Confirmar recepción')).toBeDefined();
  });
});
