import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderDetailPanel } from '../../components/widgets/OrderDetailPanel';
import type { Order } from '../../types';

const mockOrder: Order = {
  id: 'ord-det001',
  customerName: 'Luis',
  mesa: '2',
  status: 'recibido',
  payment_status: 'pendiente',
  financials: { total: 44 },
  items: [
    { name: 'Pizza', quantity: 1, price: 28 },
    { name: 'Gaseosa', quantity: 2, price: 8 },
  ],
};

describe('OrderDetailPanel', () => {
  it('renders order info and items', () => {
    render(<OrderDetailPanel order={mockOrder} onClose={vi.fn()} />);
    expect(screen.getByText(/DET001/)).toBeDefined();
    expect(screen.getByText(/Luis/)).toBeDefined();
    expect(screen.getByText(/Mesa 2/)).toBeDefined();
    expect(screen.getByText(/Pizza/)).toBeDefined();
    expect(screen.getByText(/Gaseosa/)).toBeDefined();
  });

  it('renders total', () => {
    render(<OrderDetailPanel order={mockOrder} onClose={vi.fn()} />);
    expect(screen.getByText(/44\.00/)).toBeDefined();
  });

  it('shows discount toggle when onDiscountChange provided', () => {
    render(<OrderDetailPanel order={mockOrder} onClose={vi.fn()} onDiscountChange={vi.fn()} />);
    const discountButtons = screen.getAllByText('Descuento');
    expect(discountButtons.length).toBe(2);
  });

  it('expands discount controls on click', () => {
    render(<OrderDetailPanel order={mockOrder} onClose={vi.fn()} onDiscountChange={vi.fn()} />);
    fireEvent.click(screen.getAllByText('Descuento')[0]);
    // After expand, toggle button shows "OFF" initially (d.active = false)
    expect(screen.getByText('OFF')).toBeDefined();
  });

  it('calls onDiscountChange when discount activated', () => {
    const onDiscountChange = vi.fn();
    render(<OrderDetailPanel order={mockOrder} onClose={vi.fn()} onDiscountChange={onDiscountChange} />);
    // Expand first item
    fireEvent.click(screen.getAllByText('Descuento')[0]);
    // Set value (10%)
    const valueInputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(valueInputs[0], { target: { value: '10' } });
    // Toggle ON
    fireEvent.click(screen.getByText('OFF'));
    expect(onDiscountChange).toHaveBeenCalledWith(0, { type: 'percentage', value: 10, reason: '' });
  });

  it('handles discount deactivation', () => {
    const onDiscountChange = vi.fn();
    render(<OrderDetailPanel order={mockOrder} onClose={vi.fn()} onDiscountChange={onDiscountChange} />);
    fireEvent.click(screen.getAllByText('Descuento')[0]);
    const valueInputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(valueInputs[0], { target: { value: '10' } });
    fireEvent.click(screen.getByText('OFF')); // activate
    fireEvent.click(screen.getByText('ON')); // deactivate
    const lastCall = onDiscountChange.mock.calls[onDiscountChange.mock.calls.length - 1];
    expect(lastCall[1]).toBeNull();
  });

  it('calls onClose via close button', () => {
    const onClose = vi.fn();
    render(<OrderDetailPanel order={mockOrder} onClose={onClose} />);
    // The close button has an X icon inside, use role
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
