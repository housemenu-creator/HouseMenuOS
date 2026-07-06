import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplitBillModal } from '../SplitBillModal';
import type { Order } from '../../../types';

const mockOrder: Order = {
  id: 'ord-spl001',
  customerName: 'Pedro',
  mesa: '4',
  status: 'recibido',
  payment_status: 'pendiente',
  financials: { total: 45 },
  items: [
    { name: 'Ceviche', quantity: 1, price: 25 },
    { name: 'Chicha', quantity: 2, price: 10 },
  ],
};

describe('SplitBillModal', () => {
  it('renders order info and items', () => {
    render(<SplitBillModal order={mockOrder} onSplit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/SPL001/)).toBeDefined();
    expect(screen.getByText(/Pedro/)).toBeDefined();
    expect(screen.getByText(/Mesa 4/)).toBeDefined();
    expect(screen.getByText(/1x Ceviche/)).toBeDefined();
    expect(screen.getByText(/2x Chicha/)).toBeDefined();
  });

  it('renders initial diner', () => {
    render(<SplitBillModal order={mockOrder} onSplit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue('Comensal 1')).toBeDefined();
  });

  it('adds diners up to MAX', () => {
    render(<SplitBillModal order={mockOrder} onSplit={vi.fn()} onClose={vi.fn()} />);
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText(/Agregar/));
    }
    expect(screen.queryByText(/Agregar/)).toBeNull();
    expect(screen.getByDisplayValue('Comensal 6')).toBeDefined();
  });

  it('shows balance warning when items unassigned', () => {
    render(<SplitBillModal order={mockOrder} onSplit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/Faltan/)).toBeDefined();
    expect(screen.getByText(/2 ítems/)).toBeDefined();
  });

  it('assigns items via toggle buttons and calls onSplit when balanced', () => {
    const onSplit = vi.fn().mockResolvedValue({ success: true });
    render(<SplitBillModal order={mockOrder} onSplit={onSplit} onClose={vi.fn()} />);

    // There are 2 items, each with a toggle button labeled "1" (diner index + 1)
    // Click both toggles to assign both items to diner 1
    const toggles = screen.getAllByRole('button').filter(b => b.textContent === '1');
    toggles.forEach(b => fireEvent.click(b));

    // Now balanced — button should be enabled
    const splitBtn = screen.getByText(/Split/).closest('button');
    expect(splitBtn).not.toBeDisabled();
    fireEvent.click(splitBtn!);
    expect(onSplit).toHaveBeenCalledOnce();
  });

  it('disables split button when not balanced', () => {
    render(<SplitBillModal order={mockOrder} onSplit={vi.fn()} onClose={vi.fn()} />);
    const splitBtn = screen.getByText(/Split/).closest('button');
    expect(splitBtn).toBeDisabled();
  });

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(<SplitBillModal order={mockOrder} onSplit={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
