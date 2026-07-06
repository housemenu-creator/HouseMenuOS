import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderListItem } from '../../components/widgets/OrderListItem';
import type { Order } from '../../types';

const mockOrder: Order = {
  id: 'ord-test1',
  customerName: 'Carlos',
  mesa: '5',
  status: 'recibido',
  payment_status: 'pendiente',
  financials: { total: 42.5 },
  items: [
    { name: 'Lomo Saltado', quantity: 2, price: 18 },
    { name: 'Inka Kola', quantity: 1, price: 6.5 },
  ],
};

describe('OrderListItem', () => {
  it('renders order id, customer, table and total', () => {
    render(
      <OrderListItem
        order={mockOrder}
        onQuickPay={vi.fn()} onCancel={vi.fn()}
        onTransfer={vi.fn()} onVerify={vi.fn()}
      />
    );
    expect(screen.getByText(/TEST1/)).toBeDefined();
    expect(screen.getByText(/Carlos/)).toBeDefined();
    expect(screen.getByText(/Mesa 5/)).toBeDefined();
    expect(screen.getByText(/42\.50/)).toBeDefined();
  });

  it('renders status badge', () => {
    render(
      <OrderListItem
        order={{ ...mockOrder, payment_status: 'pagado' }}
        onQuickPay={vi.fn()} onCancel={vi.fn()}
        onTransfer={vi.fn()} onVerify={vi.fn()}
      />
    );
    expect(screen.getByText('Pagado')).toBeDefined();
  });

  it('renders item preview (max 3)', () => {
    render(
      <OrderListItem
        order={mockOrder}
        onQuickPay={vi.fn()} onCancel={vi.fn()}
        onTransfer={vi.fn()} onVerify={vi.fn()}
      />
    );
    expect(screen.getByText(/2x Lomo Saltado/)).toBeDefined();
    expect(screen.getByText(/1x Inka Kola/)).toBeDefined();
  });

  it('shows quick pay button for pending orders', () => {
    render(
      <OrderListItem
        order={mockOrder}
        onQuickPay={vi.fn()} onCancel={vi.fn()}
        onTransfer={vi.fn()} onVerify={vi.fn()}
      />
    );
    expect(screen.getByText('Cobrar')).toBeDefined();
  });

  it('shows verify button for por_verificar orders', () => {
    render(
      <OrderListItem
        order={{ ...mockOrder, payment_status: 'por_verificar' }}
        onQuickPay={vi.fn()} onCancel={vi.fn()}
        onTransfer={vi.fn()} onVerify={vi.fn()}
      />
    );
    expect(screen.getByText('Verificar')).toBeDefined();
  });
});
