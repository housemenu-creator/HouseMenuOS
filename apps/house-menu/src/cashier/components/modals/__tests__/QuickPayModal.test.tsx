import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickPayModal } from '../QuickPayModal';
import type { Order } from '../../../types';

const mockOrder: Order = {
  id: 'ord-123456',
  customerName: 'Juan Pérez',
  mesa: '5',
  status: 'recibido',
  payment_status: 'pendiente',
  financials: { total: 45.5 },
};

describe('QuickPayModal', () => {
  it('renders order info', () => {
    render(<QuickPayModal order={mockOrder} onPay={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/123456/)).toBeDefined();
    expect(screen.getByText(/Juan Pérez/)).toBeDefined();
    expect(screen.getByText(/Mesa 5/)).toBeDefined();
    expect(screen.getAllByText(/45\.50/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders default payment method (Efectivo)', () => {
    render(<QuickPayModal order={mockOrder} onPay={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue('Efectivo')).toBeDefined();
  });

  it('calls onPay with method and null discount', async () => {
    const onPay = vi.fn().mockResolvedValue({ success: true });
    render(<QuickPayModal order={mockOrder} onPay={onPay} onClose={vi.fn()} />);
    // Set amount to avoid 0
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '45.50' } });
    fireEvent.click(screen.getByText(/Cobrar/));
    expect(onPay).toHaveBeenCalledWith('ord-123456', 'Efectivo', null);
  });

  it('calls onPay with selected method (Yape)', () => {
    const onPay = vi.fn().mockResolvedValue({ success: true });
    render(<QuickPayModal order={mockOrder} onPay={onPay} onClose={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('Efectivo'), { target: { value: 'Yape/Plin' } });
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '45.50' } });
    fireEvent.click(screen.getByText(/Cobrar/));
    expect(onPay).toHaveBeenCalledWith('ord-123456', 'Yape/Plin', null);
  });

  it('toggles multi-method mode', () => {
    render(<QuickPayModal order={mockOrder} onPay={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/Pago Múltiple/));
    expect(screen.getByText(/Agregar Método/)).toBeDefined();
  });

  it('adds payment entries in multi-method mode', () => {
    render(<QuickPayModal order={mockOrder} onPay={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/Pago Múltiple/));
    fireEvent.click(screen.getByText(/Agregar Método/));
    // Should have two payment entries now (Efectivo + next available)
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(2);
  });

  it('disables pay button when multi-method amounts are unbalanced', () => {
    render(<QuickPayModal order={mockOrder} onPay={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/Pago Múltiple/));
    // Don't set any amounts - amount is 0, so balance is off
    const payBtn = screen.getByText(/Cobrar/).closest('button');
    expect(payBtn).toBeDisabled();
  });

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(<QuickPayModal order={mockOrder} onPay={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
