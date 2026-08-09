import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockOnValue, mockPush, mockSet, mockUpdate, mockGet } = vi.hoisted(() => ({
  mockOnValue: vi.fn((_ref, cb) => {
    cb({ val: () => null });
    return vi.fn();
  }),
  mockPush: vi.fn(() => ({ key: 'mock-key' })),
  mockSet: vi.fn(() => Promise.resolve()),
  mockUpdate: vi.fn(() => Promise.resolve()),
  mockGet: vi.fn(),
}));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  onValue: mockOnValue,
  push: mockPush,
  set: mockSet,
  update: mockUpdate,
  get: mockGet,
  serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}));

import { useOrdersPipeline } from '../../hooks/useOrdersPipeline';
import type { Order } from '../../types';

const sampleOrders: Order[] = [
  {
    id: 'ord-1',
    customerName: 'Juan',
    status: 'recibido',
    payment_status: 'pagado',
    payment_method: 'Efectivo',
    financials: { total: 45.5 },
    createdAt: new Date('2026-07-05T10:00:00').toISOString(),
  },
  {
    id: 'ord-2',
    customerName: 'María',
    status: 'recibido',
    payment_status: 'pagado',
    payment_method: 'Yape/Plin',
    financials: { total: 32.0 },
    createdAt: new Date('2026-07-05T10:05:00').toISOString(),
  },
  {
    id: 'ord-3',
    customerName: 'Pedro',
    status: 'recibido',
    payment_status: 'pendiente',
    financials: { total: 28.5 },
    createdAt: new Date('2026-07-05T10:10:00').toISOString(),
  },
  {
    id: 'ord-4',
    customerName: 'Lucía',
    status: 'cancelado',
    payment_status: 'reembolsado',
    financials: { total: 15.0 },
    createdAt: new Date('2026-07-05T10:15:00').toISOString(),
  },
];

describe('useOrdersPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnValue.mockImplementation((_ref, cb) => {
      cb({ val: () => null });
      return vi.fn();
    });
    mockPush.mockReturnValue({ key: 'mock-key' });
    mockSet.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
    mockGet.mockResolvedValue({ val: () => null, exists: () => false });
  });

  it('starts with empty orders and loading false', () => {
    const { result } = renderHook(() => useOrdersPipeline('branch-1'));
    expect(result.current.orders).toEqual([]);
    expect(result.current.kpis).toBeDefined();
    expect(result.current.loading).toBe(false);
  });

  it('loads orders from subscription', () => {
    mockOnValue.mockImplementation((_ref, cb) => {
      const data: Record<string, object> = {};
      sampleOrders.forEach((o) => {
        const { id, ...rest } = o;
        data[id] = rest;
      });
      cb({ val: () => data });
      return vi.fn();
    });
    const { result } = renderHook(() => useOrdersPipeline('branch-1'));
    expect(result.current.orders).toHaveLength(4);
    expect(result.current.loading).toBe(false);
  });

  it('computes KPIs correctly', () => {
    mockOnValue.mockImplementation((_ref, cb) => {
      const data: Record<string, Omit<Order, 'id'>> = {};
      sampleOrders.forEach((o) => {
        const { id, ...rest } = o;
        data[id] = rest;
      });
      cb({ val: () => data });
      return vi.fn();
    });
    const { result } = renderHook(() => useOrdersPipeline('branch-1'));
    const kpis = result.current.kpis;
    expect(kpis.totalEfectivo).toBe(45.5);
    expect(kpis.totalYapePlin).toBe(32.0);
    expect(kpis.totalIngresos).toBe(77.5);
    expect(kpis.totalPendiente).toBe(28.5);
    expect(kpis.paidCount).toBe(2);
    expect(kpis.cancelledCount).toBe(1);
  });

  it('creates an order', async () => {
    mockPush.mockReturnValue({ key: 'new-ord-1' });
    mockSet.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOrdersPipeline('branch-1'));
    await act(async () => {
      const res = await result.current.createOrder({
        customerName: 'Carlos',
        items: [{ name: 'Café', quantity: 1, price: 12 }],
        total: 12,
        payment_method: 'Efectivo',
        payment_status: 'pagado',
      });
      expect(res.success).toBe(true);
      expect(res.orderId).toBe('new-ord-1');
    });
  });

  it('updates order status', async () => {
    mockGet.mockImplementation(() => Promise.resolve({
      val: () => ({ status: 'recibido', items: [] }),
      exists: () => true,
    }));
    mockUpdate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOrdersPipeline('branch-1'));
    await act(async () => {
      const res = await result.current.updateOrderStatus('ord-1', 'preparando', 'chef@test.com');
      expect(res.success).toBe(true);
    });
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('marks an order as paid', async () => {
    mockUpdate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOrdersPipeline('branch-1'));
    await act(async () => {
      const res = await result.current.markAsPaid('ord-3', 'Efectivo', 'cashier@test.com');
      expect(res.success).toBe(true);
    });
  });

  it('processes refund', async () => {
    mockUpdate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOrdersPipeline('branch-1'));
    await act(async () => {
      const res = await result.current.processRefund('ord-1', {
        amount: 10,
        method: 'Efectivo',
        reason: 'Cliente insatisfecho',
      });
      expect(res.success).toBe(true);
    });
  });

  it('returns empty on null branch', () => {
    const { result } = renderHook(() => useOrdersPipeline(null));
    expect(result.current.orders).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
