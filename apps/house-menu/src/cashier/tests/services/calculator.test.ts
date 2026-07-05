import { describe, it, expect } from 'vitest';
import {
  calculateKPIs,
  applyDiscount,
  calculateSplitTotal,
  calculateChange,
  calculateDiscountedPrice,
} from '../../services/calculator';

const baseOrders = [
  { id: '1', status: 'entregado' as const, payment_status: 'pagado' as const, payment_method: 'Efectivo' as const, financials: { total: 50 } },
  { id: '2', status: 'entregado' as const, payment_status: 'pagado' as const, payment_method: 'Yape/Plin' as const, financials: { total: 30 } },
  { id: '3', status: 'entregado' as const, payment_status: 'pagado' as const, payment_method: 'Tarjeta (POS)' as const, financials: { total: 20 } },
  { id: '4', status: 'recibido' as const, payment_status: 'pendiente' as const, financials: { total: 15 } },
  { id: '5', status: 'entregado' as const, payment_status: 'por_verificar' as const, payment_method: 'Yape/Plin' as const, financials: { total: 25 } },
  { id: '6', status: 'cancelado' as const, payment_status: 'reembolsado' as const, financials: { total: 10 } },
];

describe('calculateKPIs', () => {
  it('groups totals by payment method', () => {
    const kpis = calculateKPIs(baseOrders, 100);
    expect(kpis.totalEfectivo).toBe(50);
    expect(kpis.totalYapePlin).toBe(30);
    expect(kpis.totalPos).toBe(20);
    expect(kpis.totalIngresos).toBe(100);
  });

  it('calculates pending and verifying totals', () => {
    const kpis = calculateKPIs(baseOrders, 100);
    expect(kpis.totalPendiente).toBe(15);
    expect(kpis.totalPorVerificar).toBe(25);
  });

  it('computes expectedCash as openingBalance + efectivo', () => {
    const kpis = calculateKPIs(baseOrders, 200);
    expect(kpis.expectedCash).toBe(250);
  });

  it('returns porVerificar orders list', () => {
    const kpis = calculateKPIs(baseOrders, 100);
    expect(kpis.porVerificar).toHaveLength(1);
    expect(kpis.porVerificar[0].id).toBe('5');
  });

  it('counts paid and cancelled orders', () => {
    const kpis = calculateKPIs(baseOrders, 100);
    expect(kpis.paidCount).toBe(3);
    expect(kpis.cancelledCount).toBe(1);
  });

  it('computes average ticket', () => {
    const kpis = calculateKPIs(baseOrders, 100);
    expect(kpis.averageTicket).toBeCloseTo(33.33, 1);
  });

  it('handles empty orders array', () => {
    const kpis = calculateKPIs([], 0);
    expect(kpis.totalIngresos).toBe(0);
    expect(kpis.paidCount).toBe(0);
    expect(kpis.averageTicket).toBe(0);
  });
});

describe('applyDiscount', () => {
  it('applies percentage discount', () => {
    expect(applyDiscount(100, 'percentage', 15)).toBe(85);
    expect(applyDiscount(50, 'percentage', 100)).toBe(0);
  });

  it('applies fixed discount', () => {
    expect(applyDiscount(100, 'fixed', 20)).toBe(80);
    expect(applyDiscount(30, 'fixed', 50)).toBe(0);
  });

  it('returns original when no discount', () => {
    expect(applyDiscount(100, 'none', 0)).toBe(100);
  });

  it('handles zero or negative values', () => {
    expect(applyDiscount(100, 'percentage', 0)).toBe(100);
    expect(applyDiscount(100, 'fixed', -10)).toBe(100);
  });
});

describe('calculateSplitTotal', () => {
  it('sums items by indices', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 25, quantity: 1 },
      { price: 5, quantity: 3 },
    ];
    expect(calculateSplitTotal(items, [0, 2])).toBe(35);
    expect(calculateSplitTotal(items, [1])).toBe(25);
  });

  it('returns 0 for empty indices', () => {
    const items = [{ price: 10, quantity: 1 }];
    expect(calculateSplitTotal(items, [])).toBe(0);
  });
});

describe('calculateChange', () => {
  it('returns positive change', () => {
    expect(calculateChange(100, 80)).toBe(20);
  });

  it('returns 0 for exact payment', () => {
    expect(calculateChange(80, 80)).toBe(0);
  });

  it('returns negative for insufficient payment', () => {
    expect(calculateChange(50, 80)).toBe(-30);
  });
});

describe('calculateDiscountedPrice', () => {
  it('calculates item total without discount', () => {
    expect(calculateDiscountedPrice({ price: 10, quantity: 3 })).toBe(30);
  });

  it('applies discount to item total', () => {
    expect(calculateDiscountedPrice(
      { price: 10, quantity: 3 },
      { type: 'percentage', value: 10 },
    )).toBe(27);
  });
});
