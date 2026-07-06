import { describe, it, expect } from 'vitest';
import { buildReceiptData, renderReceiptHTML, renderReceiptText } from '../../services/receiptEngine';
import type { Order } from '../../types';

const mockOrder: Order = {
  id: 'ord-rec001',
  customerName: 'Ana',
  mesa: '3',
  status: 'entregado',
  payment_status: 'pagado',
  payment_method: 'Efectivo',
  financials: { total: 32 },
  items: [
    { name: 'Café', quantity: 2, price: 8 },
    { name: 'Sándwich', quantity: 1, price: 16 },
  ],
  createdAt: new Date('2026-07-05T12:00:00').toISOString(),
};

describe('receiptEngine', () => {
  it('builds receipt data from order', () => {
    const data = buildReceiptData(mockOrder);
    expect(data.header.orderId).toBe('REC001');
    expect(data.header.customer).toBe('Ana');
    expect(data.header.table).toBe('3');
    expect(data.items).toHaveLength(2);
    expect(data.totals.total).toBe(32);
    expect(data.totals.method).toBe('Efectivo');
  });

  it('renders HTML receipt string', () => {
    const data = buildReceiptData(mockOrder);
    const html = renderReceiptHTML(data);
    expect(html).toContain('REC001');
    expect(html).toContain('S/ 32.00');
    expect(html).toContain('Ana');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('renders text receipt string', () => {
    const data = buildReceiptData(mockOrder);
    const text = renderReceiptText(data);
    expect(text).toContain('REC001');
    expect(text).toContain('S/ 32.00');
    expect(text).toContain('Ana');
    expect(text).toContain('Gracias');
  });

  it('handles empty items gracefully', () => {
    const emptyOrder: Order = {
      id: 'ord-empty',
      customerName: 'Test',
      status: 'recibido',
      payment_status: 'pendiente',
    };
    const data = buildReceiptData(emptyOrder);
    expect(data.items).toHaveLength(0);
    expect(data.totals.total).toBe(0);
  });

  it('includes discount info when present', () => {
    const discountedOrder: Order = {
      ...mockOrder,
      totalAfterDiscount: 28,
      financials: { total: 28 },
      items: [
        { name: 'Café', quantity: 2, price: 8, discount: { type: 'percentage' as const, value: 10, reason: 'Promo' } },
      ],
    };
    const data = buildReceiptData(discountedOrder);
    const html = renderReceiptHTML(data);
    expect(html).toContain('10%');
  });
});
