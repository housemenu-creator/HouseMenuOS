import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ──
const { mocks } = vi.hoisted(() => ({
  mocks: {
    dbRef: vi.fn((_db, path) => ({ path })),
    dbGet: vi.fn(),
    dbSet: vi.fn().mockResolvedValue(undefined),
    dbPush: vi.fn(() => ({ key: 'po-new' })),
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

import { attachVoucher, createPurchaseOrder, updatePurchaseOrder } from '../logisticsService';

const PO_PATH = 'branches/branch-1/logistics/purchase_orders/po-1';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('attachVoucher', () => {
  it('hace update (merge) del PO con voucherUrl, voucherFileName, uploadedAt y updatedAt', async () => {
    await attachVoucher('branch-1', 'po-1', {
      voucherUrl: 'https://storage/voucher.jpg',
      voucherFileName: 'factura-123.jpg',
      uploadedAt: '2026-08-09T09:00:00.000Z',
    });

    expect(mocks.dbRef).toHaveBeenCalledWith({}, PO_PATH);
    expect(mocks.dbUpdate).toHaveBeenCalledWith({ path: PO_PATH }, {
      voucherUrl: 'https://storage/voucher.jpg',
      voucherFileName: 'factura-123.jpg',
      uploadedAt: '2026-08-09T09:00:00.000Z',
      updatedAt: '2026-08-09T10:00:00.000Z',
    });
    // merge: update() y no set() — no sobreescribe items/status
    expect(mocks.dbSet).not.toHaveBeenCalled();
  });

  it('usa nowISO() como uploadedAt si no se provee', async () => {
    await attachVoucher('branch-1', 'po-1', {
      voucherUrl: 'https://storage/voucher.jpg',
      voucherFileName: 'boleta.png',
    });

    expect(mocks.dbUpdate).toHaveBeenCalledWith({ path: PO_PATH }, expect.objectContaining({
      uploadedAt: '2026-08-09T10:00:00.000Z',
    }));
  });

  it('registra audit log logistics.purchase_order.voucher_attached', async () => {
    await attachVoucher('branch-1', 'po-1', {
      voucherUrl: 'https://storage/voucher.jpg',
      voucherFileName: 'factura-123.jpg',
      uploadedAt: '2026-08-09T09:00:00.000Z',
    });

    expect(mocks.auditLog).toHaveBeenCalledWith(
      'logistics.purchase_order.voucher_attached',
      { branchId: 'branch-1', orderId: 'po-1', fileName: 'factura-123.jpg' },
      'system'
    );
  });

  it('retorna { success: true }', async () => {
    const result = await attachVoucher('branch-1', 'po-1', {
      voucherUrl: 'u', voucherFileName: 'f.jpg', uploadedAt: 't',
    });
    expect(result).toEqual({ success: true });
  });
});

describe('createPurchaseOrder — campos aditivos de voucher', () => {
  it('persiste voucherUrl/voucherFileName/uploadedAt si vienen en data', async () => {
    await createPurchaseOrder('branch-1', {
      supplierId: 'sup-1',
      supplierName: 'Distribuidora Norte',
      items: [{ ingredientId: 'ing-1', name: 'Papa', quantity: 5, unit: 'kg', unitCost: 2 }],
      voucherUrl: 'https://storage/voucher.jpg',
      voucherFileName: 'factura-123.jpg',
      uploadedAt: '2026-08-09T09:00:00.000Z',
    }, 'admin@house.com');

    expect(mocks.dbSet).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'po-new' }),
      expect.objectContaining({
        voucherUrl: 'https://storage/voucher.jpg',
        voucherFileName: 'factura-123.jpg',
        uploadedAt: '2026-08-09T09:00:00.000Z',
      })
    );
  });

  it('no agrega campos de voucher si no vienen (no-op)', async () => {
    await createPurchaseOrder('branch-1', {
      supplierId: 'sup-1',
      items: [{ ingredientId: 'ing-1', name: 'Papa', quantity: 5, unit: 'kg', unitCost: 2 }],
    }, 'admin@house.com');

    const [, order] = mocks.dbSet.mock.calls[0];
    expect(order).not.toHaveProperty('voucherUrl');
    expect(order).not.toHaveProperty('voucherFileName');
    expect(order).not.toHaveProperty('uploadedAt');
    expect(order.status).toBe('pendiente');
    expect(order.items).toHaveProperty('ing-1');
  });
});

describe('updatePurchaseOrder — campos aditivos de voucher', () => {
  it('incluye voucherUrl en el update y conserva items/supplierId', async () => {
    mocks.dbGet.mockResolvedValue({ val: () => ({
      status: 'pendiente',
      supplierId: 'sup-1',
      supplierName: 'Distribuidora Norte',
      items: {},
    }) });

    await updatePurchaseOrder('branch-1', 'po-1', {
      supplierId: 'sup-1',
      items: [{ ingredientId: 'ing-1', name: 'Papa', quantity: 5, unit: 'kg', unitCost: 2 }],
      voucherUrl: 'https://storage/voucher.jpg',
      voucherFileName: 'factura-123.jpg',
      uploadedAt: '2026-08-09T09:00:00.000Z',
    }, 'admin@house.com');

    expect(mocks.dbUpdate).toHaveBeenCalledWith(
      { path: PO_PATH },
      expect.objectContaining({
        voucherUrl: 'https://storage/voucher.jpg',
        voucherFileName: 'factura-123.jpg',
        uploadedAt: '2026-08-09T09:00:00.000Z',
        supplierId: 'sup-1',
        items: { 'ing-1': expect.objectContaining({ name: 'Papa', quantity: 5 }) },
      })
    );
  });

  it('no incluye campos de voucher si no vienen', async () => {
    mocks.dbGet.mockResolvedValue({ val: () => ({
      status: 'pendiente',
      supplierId: 'sup-1',
      items: {},
    }) });

    await updatePurchaseOrder('branch-1', 'po-1', {
      supplierId: 'sup-1',
      items: [{ ingredientId: 'ing-1', name: 'Papa', quantity: 5, unit: 'kg', unitCost: 2 }],
    }, 'admin@house.com');

    const payload = mocks.dbUpdate.mock.calls[0][1];
    expect(payload).not.toHaveProperty('voucherUrl');
    expect(payload).not.toHaveProperty('voucherFileName');
    expect(payload).not.toHaveProperty('uploadedAt');
  });
});
