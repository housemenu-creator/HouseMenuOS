import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
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
    updatePurchaseOrder: vi.fn(),
    receivePurchaseOrder: vi.fn(),
    cancelPurchaseOrder: vi.fn(),
    attachVoucher: vi.fn(),
    subscribeMovements: vi.fn((_b, cb) => { cb([]); return () => {}; }),
    registerMovement: vi.fn(),
    fbRef: vi.fn((_db, _path) => ({})),
    fbOnValue: vi.fn((_ref, cb) => { cb({ val: () => null }); return () => {}; }),
    uploadVoucher: vi.fn(),
  },
}));

// ── Context mocks ──
vi.mock('../../../context/BranchContext', () => ({
  useBranch: () => ({ activeBranchId: 'branch-1' }),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'admin@house.com' } }),
}));

// ── Framermotion mock ──
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div>, button: ({ children, ...p }) => <button {...p}>{children}</button> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// ── Firebase mocks ──
vi.mock('@house/db', () => ({ realtimeDB: {}, storage: {} }));

vi.mock('firebase/database', () => ({
  ref: mocks.fbRef,
  onValue: mocks.fbOnValue,
}));

vi.mock('firebase/storage', () => ({
  ref: () => ({}),
  uploadBytesResumable: () => ({}),
  getDownloadURL: async () => '',
  deleteObject: async () => {},
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
  updatePurchaseOrder: mocks.updatePurchaseOrder,
  receivePurchaseOrder: mocks.receivePurchaseOrder,
  cancelPurchaseOrder: mocks.cancelPurchaseOrder,
  attachVoucher: mocks.attachVoucher,
  subscribeMovements: mocks.subscribeMovements,
  registerMovement: mocks.registerMovement,
}));

// ── Storage service: real module (validateVoucherFile real), uploadVoucher mockeado ──
vi.mock('../../../lib/storageService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    storageService: {
      ...actual.storageService,
      uploadVoucher: mocks.uploadVoucher,
    },
  };
});

// ── Test data ──
const mockSuppliers = [{ id: 'sup-1', name: 'Distribuidora Norte', contact: 'Juan', phone: '999-111-222', email: 'juan@norte.com', notes: 'Entrega martes' }];

const pendingPo = {
  id: 'po-1',
  supplierId: 'sup-1',
  supplierName: 'Distribuidora Norte',
  status: 'pendiente',
  orderedAt: '2026-08-08T10:00:00.000Z',
  total: 30,
  items: {
    'ing-papa': { ingredientId: 'ing-papa', name: 'Papa', quantity: 10, unit: 'kg', unitCost: 2 },
  },
};

async function openReceiveModal() {
  render(<LogisticsTab />);
  fireEvent.click(screen.getByText('Compras'));
  await waitFor(() => { expect(screen.getByText('Distribuidora Norte')).toBeDefined(); });
  fireEvent.click(screen.getByText('Recibir'));
  await waitFor(() => { expect(screen.getByText('Confirmar recepción')).toBeDefined(); });
}

function selectFile(file) {
  fireEvent.change(screen.getByLabelText(/Subir voucher/), { target: { files: [file] } });
}

describe('ReceiveOrderModal — voucher upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscribeIngredients.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeRecipes.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.subscribeSuppliers.mockImplementation((_b, cb) => { cb(mockSuppliers); return () => {}; });
    mocks.subscribePurchaseOrders.mockImplementation((_b, cb) => { cb([pendingPo]); return () => {}; });
    mocks.subscribeMovements.mockImplementation((_b, cb) => { cb([]); return () => {}; });
    mocks.uploadVoucher.mockResolvedValue({ url: 'https://download.url/voucher.jpg', path: 'branches/branch-1/vouchers/po-1_123' });
    mocks.attachVoucher.mockResolvedValue({ success: true });
  });

  it('sube el voucher, persiste en el PO (attachVoucher) y muestra preview con nombre + hora', async () => {
    await openReceiveModal();

    const file = new File(['data'], 'factura-123.jpg', { type: 'image/jpeg' });
    selectFile(file);

    await waitFor(() => {
      expect(mocks.uploadVoucher).toHaveBeenCalledWith('branch-1', 'po-1', file, expect.any(Function));
    });
    await waitFor(() => {
      expect(mocks.attachVoucher).toHaveBeenCalledWith('branch-1', 'po-1', expect.objectContaining({
        voucherUrl: 'https://download.url/voucher.jpg',
        voucherFileName: 'factura-123.jpg',
        uploadedAt: expect.any(String),
      }));
    });

    // Preview: filename + thumbnail con la URL descargada
    await waitFor(() => { expect(screen.getByText('factura-123.jpg')).toBeDefined(); });
    expect(screen.getByAltText(/voucher/i)).toHaveAttribute('src', 'https://download.url/voucher.jpg');
    expect(screen.getByText(/Subido/)).toBeDefined();
  });

  it('rechaza archivo > 5MB con error inline antes de subir', async () => {
    await openReceiveModal();

    const big = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    selectFile(big);

    await waitFor(() => { expect(screen.getByRole('alert')).toHaveTextContent(/5MB/); });
    expect(mocks.uploadVoucher).not.toHaveBeenCalled();
    expect(mocks.attachVoucher).not.toHaveBeenCalled();
  });

  it('rechaza tipo no-imagen (PDF) con error inline antes de subir', async () => {
    await openReceiveModal();

    const pdf = new File(['x'], 'factura.pdf', { type: 'application/pdf' });
    selectFile(pdf);

    await waitFor(() => { expect(screen.getByRole('alert')).toHaveTextContent(/Solo imágenes/); });
    expect(mocks.uploadVoucher).not.toHaveBeenCalled();
    expect(mocks.attachVoucher).not.toHaveBeenCalled();
  });

  it('muestra el progreso de subida (porcentaje) y lo oculta al terminar', async () => {
    let resolveUpload;
    mocks.uploadVoucher.mockImplementation((_b, _o, _f, onProgress) => {
      onProgress(42);
      return new Promise((resolve) => { resolveUpload = resolve; });
    });
    await openReceiveModal();

    const file = new File(['data'], 'factura-123.jpg', { type: 'image/jpeg' });
    selectFile(file);

    await waitFor(() => { expect(screen.getByText('42%')).toBeDefined(); });

    await act(async () => { resolveUpload({ url: 'https://download.url/voucher.jpg', path: 'branches/branch-1/vouchers/po-1_123' }); });
    await waitFor(() => { expect(screen.queryByText('42%')).toBeNull(); });
    await waitFor(() => { expect(screen.getByText('factura-123.jpg')).toBeDefined(); });
  });

  it('resetea el estado del voucher al cerrar y reabrir el modal', async () => {
    await openReceiveModal();

    const file = new File(['data'], 'factura-123.jpg', { type: 'image/jpeg' });
    selectFile(file);
    await waitFor(() => { expect(screen.getByText('factura-123.jpg')).toBeDefined(); });

    const modal = screen.getByRole('dialog', { name: 'Recibir orden' });
    fireEvent.click(within(modal).getByText('Cancelar'));
    await waitFor(() => { expect(screen.queryByText('Confirmar recepción')).toBeNull(); });

    fireEvent.click(screen.getByText('Recibir'));
    await waitFor(() => { expect(screen.getByText('Confirmar recepción')).toBeDefined(); });

    expect(screen.queryByText('factura-123.jpg')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByAltText(/voucher/i)).toBeNull();
  });

  it('muestra error inline si la subida falla y el modal sigue usable', async () => {
    mocks.uploadVoucher.mockRejectedValue(new Error('storage/unauthorized'));
    await openReceiveModal();

    const file = new File(['data'], 'factura-123.jpg', { type: 'image/jpeg' });
    selectFile(file);

    await waitFor(() => { expect(screen.getByRole('alert')).toHaveTextContent(/No se pudo subir el voucher/); });
    expect(mocks.attachVoucher).not.toHaveBeenCalled();
    expect(screen.getByText('Confirmar recepción')).toBeDefined();
  });
});
