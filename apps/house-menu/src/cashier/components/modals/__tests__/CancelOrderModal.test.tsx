import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CancelOrderModal } from '../CancelOrderModal';
import type { Order } from '../../../types';

const mockOrder: Order = {
  id: 'ord-abc123',
  customerName: 'Juan Pérez',
  status: 'recibido',
  payment_status: 'pendiente',
  financials: { total: 45.5 },
};

describe('CancelOrderModal', () => {
  it('renders order info', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/ABC123/)).toBeDefined();
    expect(screen.getByText(/Juan Pérez/)).toBeDefined();
    expect(screen.getByText('S/ 45.50')).toBeDefined();
  });

  it('calls onCancel with reason', () => {
    const onCancel = vi.fn().mockResolvedValue({ success: true });
    render(<CancelOrderModal order={mockOrder} onCancel={onCancel} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Explica/), { target: { value: 'Cliente no satisfecho' } });
    const btns = screen.getAllByText(/Cancelar Orden/);
    fireEvent.click(btns[btns.length - 1]); // last one is the button
    expect(onCancel).toHaveBeenCalledWith('ord-abc123', 'Cliente no satisfecho');
  });

  it('disables button without reason', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onClose={vi.fn()} />);
    const btns = screen.getAllByText(/Cancelar Orden/);
    expect(btns[btns.length - 1].closest('button')).toBeDisabled();
  });

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
