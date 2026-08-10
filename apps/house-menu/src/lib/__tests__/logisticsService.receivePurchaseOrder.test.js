import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ──
const { mocks } = vi.hoisted(() => ({
  mocks: {
    dbRef: vi.fn((_db, path) => ({ path })),
    dbGet: vi.fn(),
    dbSet: vi.fn().mockResolvedValue(undefined),
    dbPush: vi.fn(() => ({ key: 'mov-1' })),
    dbUpdate: vi.fn().mockResolvedValue(undefined),
    dbRemove: vi.fn().mockResolvedValue(undefined),
    dbRunTransaction: vi.fn(),
    dbOnValue: vi.fn(),
    pub: vi.fn().mockResolvedValue(undefined),
    auditLog: vi.fn(),
    nowISO: vi.fn(() => '2026-08-09T10:00:00.000Z'),
  },
}));

vi.mock('firebase/database', () => ({
  ref: mocks.dbRef,
  get: mocks.dbGet,
  set: mocks.dbSet,
  push: mocks.dbPush,
  update: mocks.dbUpdate,
  remove: mocks.dbRemove,
  runTransaction: mocks.dbRunTransaction,
  onValue: mocks.dbOnValue,
}));

vi.mock('@house/db', () => ({ realtimeDB: {} }));
vi.mock('@house/event-bus', () => ({ pub: mocks.pub }));
vi.mock('../auditService', () => ({ auditLog: mocks.auditLog }));
vi.mock('../format', () => ({ nowISO: mocks.nowISO }));

import { receivePurchaseOrder } from '../logisticsService';

// PO pendiente con voucher subido (campos aditivos de Phase 1/2)
const orderWithVoucher = {
  supplierId: 'sup-1',
  supplierName: 'Distribuidora Norte',
  status: 'pendiente',
  total: 20,
  items: {
    'ing-papa': { ingredientId: 'ing-papa', name: 'Papa', quantity: 10, unit: 'kg', unitCost: 2 },
  },
  voucherUrl: 'https://storage/voucher.jpg',
  voucherFileName: 'factura-123.jpg',
  uploadedAt: '2026-08-09T09:00:00.000Z',
};

/**
 * Mock de runTransaction con estado mutable:
 * - el txn del PO usa `orderRecord` (aborta devolviendo undefined si no está pendiente)
 * - los txn de ingredientes (registerMovement) usan un ingrediente base
 */
function mockOrderTransaction(orderRecordBox) {
  mocks.dbRunTransaction.mockImplementation(async (r, updateFn) => {
    const isIngredient = String(r.path).includes('/ingredients/');
    const current = isIngredient
      ? { stock: 0, minStock: 0, name: 'Papa', supplierIds: [] }
      : orderRecordBox.current;
    const next = updateFn(current);
    if (next === undefined) return { committed: false, snapshot: { val: () => current } };
    // Solo el txn del PO muta el registro de la orden; el de ingrediente (registerMovement) no
    if (!isIngredient) orderRecordBox.current = next;
    return { committed: true, snapshot: { val: () => next } };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Mismo costo que el del PO → sin price changes en los tests felices
  mocks.dbGet.mockResolvedValue({ val: () => ({ cost: 2 }) });
});

describe('receivePurchaseOrder — los campos de voucher sobreviven a la recepción', () => {
  it('5.2 — el merge de la transacción conserva voucherUrl/voucherFileName/uploadedAt al marcar recibido', async () => {
    const box = { current: { ...orderWithVoucher } };
    mockOrderTransaction(box);

    const result = await receivePurchaseOrder('branch-1', 'po-1', 'admin@house.com', { 'ing-papa': 8 });

    expect(result).toEqual({ success: true, priceChanges: [] });
    // El registro resultante de la transacción (espread {...current, status, receivedAt})
    // conserva los campos aditivos del voucher y los items del PO.
    expect(box.current).toMatchObject({
      status: 'recibido',
      receivedAt: '2026-08-09T10:00:00.000Z',
      voucherUrl: 'https://storage/voucher.jpg',
      voucherFileName: 'factura-123.jpg',
      uploadedAt: '2026-08-09T09:00:00.000Z',
      items: { 'ing-papa': expect.objectContaining({ name: 'Papa', quantity: 10 }) },
    });

    // Movimiento de stock con la cantidad confirmada (qty 8 × unitCost 2)
    expect(mocks.dbPush).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'branches/branch-1/logistics/movements' })
    );
    expect(mocks.dbSet).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'mov-1' }),
      expect.objectContaining({
        ingredientId: 'ing-papa',
        type: 'entrada',
        quantity: 8,
        unit: 'kg',
        reason: 'Compra',
        reference: 'PO-po-1',
        cost: 16,
      })
    );
    // Evento del catálogo + audit
    expect(mocks.pub).toHaveBeenCalledWith(
      'purchase_order.delivered',
      expect.objectContaining({ purchaseOrderId: 'po-1', supplierId: 'sup-1' }),
      expect.anything()
    );
    expect(mocks.auditLog).toHaveBeenCalledWith('logistics.purchase_order.received', expect.anything(), 'admin@house.com');
  });

  it('5.3 — doble recepción: el lock atómico aborta y no duplica movimientos/eventos; el voucher queda intacto', async () => {
    // El PO ya fue recibido (segundo intento por cualquier vía)
    const box = {
      current: { ...orderWithVoucher, status: 'recibido', receivedAt: '2026-08-08T18:00:00.000Z' },
    };
    mockOrderTransaction(box);

    const result = await receivePurchaseOrder('branch-1', 'po-1', 'admin@house.com', { 'ing-papa': 5 });

    expect(result).toEqual({ success: false, error: 'Orden no encontrada o ya recibida' });
    expect(mocks.dbPush).not.toHaveBeenCalled(); // sin movimientos duplicados
    expect(mocks.pub).not.toHaveBeenCalled();     // sin evento purchase_order.delivered duplicado
    expect(mocks.auditLog).not.toHaveBeenCalled(); // sin audit duplicado
    // El registro no fue mutado: status recibido + voucher intacto
    expect(box.current).toMatchObject({
      status: 'recibido',
      voucherUrl: 'https://storage/voucher.jpg',
      voucherFileName: 'factura-123.jpg',
      uploadedAt: '2026-08-09T09:00:00.000Z',
    });
  });

  it('5.3 — primera recepción OK y segunda aborta (secuencia realista doble-click)', async () => {
    const box = { current: { ...orderWithVoucher } };
    mockOrderTransaction(box);

    const first = await receivePurchaseOrder('branch-1', 'po-1', 'admin@house.com', { 'ing-papa': 4 });
    expect(first.success).toBe(true);

    // Segundo disparo (doble click): la transacción ya no ve status 'pendiente'
    const second = await receivePurchaseOrder('branch-1', 'po-1', 'admin@house.com', { 'ing-papa': 4 });
    expect(second).toEqual({ success: false, error: 'Orden no encontrada o ya recibida' });

    // Exactamente un movimiento y un evento
    expect(mocks.dbPush).toHaveBeenCalledTimes(1);
    expect(mocks.pub).toHaveBeenCalledTimes(1);
    expect(mocks.pub).toHaveBeenCalledWith('purchase_order.delivered', expect.anything(), expect.anything());
  });

  it('costos efectivos de la boleta (costs param) alimentan kardex y price-change — la boleta es la fuente de verdad', async () => {
    const box = { current: { ...orderWithVoucher } };
    mockOrderTransaction(box);
    // El insumo figura a costo viejo 2.0 en catálogo → la boleta dice 3.5 → price change
    mocks.dbGet.mockResolvedValue({ val: () => ({ cost: 2 }) });

    const result = await receivePurchaseOrder(
      'branch-1', 'po-1', 'admin@house.com',
      { 'ing-papa': 10 },
      { 'ing-papa': 3.5 } // costo efectivo leído de la boleta
    );

    expect(result.success).toBe(true);
    // Kardex: qty 10 × unitCost 3.5 = 35 (NO 10 × 2 = 20 del PO)
    expect(mocks.dbSet).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'mov-1' }),
      expect.objectContaining({ quantity: 10, cost: 35 })
    );
    // Price change detectado contra el costo efectivo
    expect(result.priceChanges).toEqual([
      expect.objectContaining({ ingredientId: 'ing-papa', oldCost: 2, newCost: 3.5 }),
    ]);
  });

  it('costs param vacío mantiene el comportamiento legacy (unitCost del PO)', async () => {
    const box = { current: { ...orderWithVoucher } };
    mockOrderTransaction(box);

    const result = await receivePurchaseOrder('branch-1', 'po-1', 'admin@house.com', { 'ing-papa': 10 }, {});

    expect(result.success).toBe(true);
    expect(mocks.dbSet).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'mov-1' }),
      expect.objectContaining({ quantity: 10, cost: 20 }) // 10 × unitCost del PO (2)
    );
    expect(result.priceChanges).toEqual([]);
  });
});
