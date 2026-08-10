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
    nowISO: vi.fn(() => '2026-08-10T12:00:00.000Z'),
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

import { recordDirectPurchase } from '../logisticsService';

const matchedPayload = {
  intakeId: 'intake-abc123',
  matched: [{ ingredientId: 'ing-papa', qty: 10, cost: 2.5 }],
  newIngredients: [],
};

/** txn de registerMovement: ingrediente base con stock 0. */
function mockIngredientTxn() {
  mocks.dbRunTransaction.mockImplementation(async (_r, updateFn) => {
    const current = { stock: 0, minStock: 0, name: 'Papa', supplierIds: [] };
    const next = updateFn(current);
    return { committed: true, snapshot: { val: () => next } };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dbGet.mockResolvedValue({ val: () => ({ name: 'Papa', unit: 'kg', cost: 2, stock: 0 }) });
  mockIngredientTxn();
});

describe('recordDirectPurchase — compra directa de boleta sin OC', () => {
  it('todo emparejado: movimiento entrada/Compra, costo actualizado, audit', async () => {
    const result = await recordDirectPurchase('branch-1', matchedPayload, 'admin@house.com');

    expect(result).toEqual({ success: true, total: 25, newIngredients: [] });
    // Movimiento con referencia VOUCHER-<intakeId> y costo efectivo 2.5×10
    expect(mocks.dbSet).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'mov-1' }),
      expect.objectContaining({
        ingredientId: 'ing-papa',
        type: 'entrada',
        quantity: 10,
        unit: 'kg',
        reason: 'Compra',
        reference: 'VOUCHER-abc123',
        cost: 25,
      })
    );
    // Costo actualizado en batch (2 → 2.5)
    expect(mocks.dbUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ 'branches/branch-1/logistics/ingredients/ing-papa/cost': 2.5 })
    );
    expect(mocks.auditLog).toHaveBeenCalledWith(
      'logistics.direct_purchase.recorded',
      expect.objectContaining({ lineCount: 1, newIngredientCount: 0, total: 25 }),
      'admin@house.com'
    );
  });

  it('línea aprobada crea insumo (stock 0) y su movimiento usa el id nuevo', async () => {
    mocks.dbPush
      .mockReturnValueOnce({ key: 'ing-nuevo-1' }) // createIngredient
      .mockReturnValue({ key: 'mov-1' });           // registerMovement
    const payload = {
      intakeId: 'intake-xyz789',
      matched: [],
      newIngredients: [{ name: 'Detergente', unit: 'unidad', cost: 6, qty: 2 }],
    };

    const result = await recordDirectPurchase('branch-1', payload, 'admin@house.com');

    expect(result.success).toBe(true);
    expect(result.newIngredients).toEqual([{ id: 'ing-nuevo-1', name: 'Detergente' }]);
    // createIngredient: insumo con stock 0 (el stock entra vía movimiento)
    expect(mocks.dbSet).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'ing-nuevo-1' }),
      expect.objectContaining({ name: 'Detergente', unit: 'unidad', stock: 0, cost: 6 })
    );
    // Movimiento apunta al id nuevo: qty 2 × costo 6 = 12
    expect(mocks.dbSet).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'mov-1' }),
      expect.objectContaining({
        ingredientId: 'ing-nuevo-1',
        quantity: 2,
        unit: 'unidad',
        reason: 'Compra',
        reference: 'VOUCHER-xyz789',
        cost: 12,
      })
    );
    expect(mocks.auditLog).toHaveBeenCalledWith(
      'logistics.direct_purchase.recorded',
      expect.objectContaining({ lineCount: 1, newIngredientCount: 1 }),
      'admin@house.com'
    );
  });

  it('línea no aprobada (omitida del payload) no crea nada', async () => {
    // La boleta tenía 2 líneas; el admin solo aprobó la de papa (detergente skip)
    const result = await recordDirectPurchase('branch-1', {
      intakeId: 'intake-zzz999',
      matched: [{ ingredientId: 'ing-papa', qty: 5, cost: 2 }],
      newIngredients: [],
    }, 'admin@house.com');

    expect(result.success).toBe(true);
    expect(mocks.dbPush).toHaveBeenCalledTimes(1); // solo el movimiento de papa
    expect(mocks.dbSet).toHaveBeenCalledTimes(1);  // solo el movimiento, sin insumo nuevo
    expect(mocks.auditLog).toHaveBeenCalledWith(
      'logistics.direct_purchase.recorded',
      expect.objectContaining({ lineCount: 1, newIngredientCount: 0 }),
      expect.anything()
    );
  });

  it('ediciones del admin (qty/cost) ganan sobre el prefill del OCR', async () => {
    const result = await recordDirectPurchase('branch-1', {
      ...matchedPayload,
      matched: [{ ingredientId: 'ing-papa', qty: 3, cost: 4 }],
    }, 'admin@house.com');

    expect(result.success).toBe(true);
    expect(mocks.dbSet).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'mov-1' }),
      expect.objectContaining({ quantity: 3, cost: 12 }) // 3 × 4, no 10 × 2.5
    );
  });

  it('doble submit concurrente: el segundo disparo falla sin duplicar movimientos', async () => {
    const first = recordDirectPurchase('branch-1', matchedPayload, 'admin@house.com');
    // El flag in-flight ya está seteado → segundo disparo falla de inmediato
    const second = await recordDirectPurchase('branch-1', matchedPayload, 'admin@house.com');
    expect(second).toEqual({ success: false, error: 'Operación en curso' });

    await first;
    expect(mocks.dbSet).toHaveBeenCalledTimes(1);

    // El flag se libera en finally → una llamada posterior funciona
    const third = await recordDirectPurchase('branch-1', matchedPayload, 'admin@house.com');
    expect(third.success).toBe(true);
  });

  it('costo 0/ausente: el costo del insumo existente NO se toca (S5)', async () => {
    const result = await recordDirectPurchase('branch-1', {
      ...matchedPayload,
      matched: [{ ingredientId: 'ing-papa', qty: 10, cost: 0 }],
    }, 'admin@house.com');

    expect(result.success).toBe(true);
    expect(mocks.dbUpdate).not.toHaveBeenCalled(); // sin batch update de costos
    // El movimiento usa el costo existente (2) como costo efectivo
    expect(mocks.dbSet).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'mov-1' }),
      expect.objectContaining({ quantity: 10, cost: 20 })
    );
  });

  it('insumo inexistente en matched: falla sin registrar nada', async () => {
    mocks.dbGet.mockResolvedValue({ val: () => null });

    const result = await recordDirectPurchase('branch-1', matchedPayload, 'admin@house.com');

    expect(result).toEqual({ success: false, error: 'Insumo no encontrado: ing-papa' });
    expect(mocks.dbPush).not.toHaveBeenCalled();
    expect(mocks.dbSet).not.toHaveBeenCalled();
    expect(mocks.auditLog).not.toHaveBeenCalled();
  });

  it('insumo nuevo con nombre duplicado: falla sin crear (guard anti-duplicados)', async () => {
    // Sin líneas matched: el primer (y único) GET es el dup-check de ingredientes
    mocks.dbGet.mockResolvedValue({ val: () => ({ 'ing-papa': { name: 'Papa' } }) });

    const result = await recordDirectPurchase('branch-1', {
      intakeId: 'intake-dup001',
      matched: [],
      newIngredients: [{ name: 'papa', unit: 'kg', cost: 2, qty: 5 }],
    }, 'admin@house.com');

    expect(result).toEqual({ success: false, error: 'Ya existe el insumo "papa" — usalo de la lista o ajustá el nombre' });
    expect(mocks.dbPush).not.toHaveBeenCalled(); // no se crea nada
    expect(mocks.auditLog).not.toHaveBeenCalled();
  });

  it('payload vacío: falla con error claro', async () => {
    const result = await recordDirectPurchase('branch-1', { intakeId: 'intake-000', matched: [], newIngredients: [] }, 'admin@house.com');
    expect(result).toEqual({ success: false, error: 'No hay líneas para registrar' });
  });
});
