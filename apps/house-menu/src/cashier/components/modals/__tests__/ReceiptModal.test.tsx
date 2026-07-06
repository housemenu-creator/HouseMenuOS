import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReceiptModal } from '../ReceiptModal';
import type { Order } from '../../../types';

const mockOrder: Order = {
  id: 'ord-rct001',
  customerName: 'Ana',
  status: 'recibido',
  payment_status: 'pagado',
  payment_method: 'Efectivo',
  mesa: '7',
  total: 28.0,
  items: [
    { name: 'Café', quantity: 2, price: 8 },
    { name: 'Sándwich', quantity: 1, price: 12 },
  ],
  createdAt: new Date('2026-07-05T10:30:00').toISOString(),
};

describe('ReceiptModal', () => {
  it('renders order items', () => {
    render(<ReceiptModal order={mockOrder} branchName="Mi Local" onClose={vi.fn()} />);
    expect(screen.getByText(/MESA 7/)).toBeDefined();
    expect(screen.getByText(/Ana/)).toBeDefined();
    expect(screen.getByText(/2x Café/)).toBeDefined();
    expect(screen.getByText(/1x Sándwich/)).toBeDefined();
    expect(screen.getByText(/EFECTIVO/)).toBeDefined();
    expect(screen.getByText(/Mi Local/)).toBeDefined();
  });

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(<ReceiptModal order={mockOrder} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
