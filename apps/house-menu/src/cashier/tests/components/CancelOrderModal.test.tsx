import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CancelOrderModal } from '../../components/modals/CancelOrderModal';
import type { Order } from '../../types';

const mockOrder: Order = {
  id: 'ord-cancel-test-1',
  customerName: 'Carlos',
  mesa: '5',
  status: 'recibido',
  payment_status: 'pendiente',
  financials: { total: 56 },
  items: [
    { name: 'Lomo Saltado', quantity: 1, price: 28 },
    { name: 'Chicha Morada', quantity: 2, price: 12 },
    { name: 'Arroz con Mariscos', quantity: 1, price: 16 },
  ],
};

const singleItemOrder: Order = {
  id: 'ord-single',
  customerName: 'Ana',
  status: 'recibido',
  payment_status: 'pendiente',
  financials: { total: 15 },
  items: [
    { name: 'Ceviche', quantity: 1, price: 15 },
  ],
};

const emptyItemsOrder: Order = {
  id: 'ord-empty',
  customerName: 'Empty',
  status: 'recibido',
  payment_status: 'pendiente',
  financials: { total: 0 },
  items: [],
};

/** Finds the primary action button — the one with Cancelar/Reembolsar text */
function getActionButton(): HTMLButtonElement {
  const buttons = screen.getAllByRole('button');
  return buttons.find(b => /Cancelar|Reembolsar/.test(b.textContent || '')) as HTMLButtonElement;
}

describe('CancelOrderModal — Full Cancel', () => {
  it('renders modal with order info', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getAllByText('Cancelar Orden').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/TEST-1/)).toBeDefined();
    expect(screen.getByText(/Carlos/)).toBeDefined();
    expect(screen.getByText(/Mesa 5/)).toBeDefined();
    expect(screen.getByText(/56\.00/)).toBeDefined();
  });

  it('requires reason to proceed', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onClose={vi.fn()} />);
    expect(getActionButton().disabled).toBe(true);
  });

  it('enables cancel when reason is entered', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onClose={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Explica detalladamente/);
    fireEvent.change(textarea, { target: { value: 'Cliente no conforme' } });
    expect(getActionButton().disabled).toBe(false);
  });

  it('calls onCancel with orderId and reason', async () => {
    const onCancel = vi.fn().mockResolvedValue({ success: true });
    render(<CancelOrderModal order={mockOrder} onCancel={onCancel} onClose={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Explica detalladamente/);
    fireEvent.change(textarea, { target: { value: 'Cliente se fue' } });
    fireEvent.click(getActionButton());
    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledWith('ord-cancel-test-1', 'Cliente se fue');
    });
  });

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Volver button', () => {
    const onClose = vi.fn();
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Volver'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows processing state while cancelling', async () => {
    const onCancel = vi.fn(() => new Promise<{ success: boolean }>(resolve => setTimeout(resolve, 100)));
    render(<CancelOrderModal order={mockOrder} onCancel={onCancel} onClose={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Explica detalladamente/);
    fireEvent.change(textarea, { target: { value: 'Motivo' } });
    fireEvent.click(getActionButton());
    expect(screen.getByText(/Procesando/)).toBeDefined();
  });

  it('does not show item checkboxes when onRefund not provided', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText(/Seleccioná los items/)).toBeNull();
  });

  it('uses quick reason buttons', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Cliente insatisfecho'));
    const textarea = screen.getByPlaceholderText(/Explica detalladamente/) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Cliente insatisfecho');
  });
});

describe('CancelOrderModal — Partial Refund', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows item selection when onRefund provided', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onRefund={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/Seleccioná los items/)).toBeDefined();
    expect(screen.getByText('Lomo Saltado')).toBeDefined();
    expect(screen.getByText('Chicha Morada')).toBeDefined();
    expect(screen.getByText('Arroz con Mariscos')).toBeDefined();
  });

  it('shows partial refund UI when items selected', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onRefund={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Lomo Saltado'));
    expect(screen.getByText('Reembolso Parcial')).toBeDefined();
    expect(screen.getByText(/Reembolsar \(1\)/)).toBeDefined();
    // Total text is: "S/ 28.00 / S/ 56.00" — 56.00 only appears in the total
    expect(screen.getByText(/56\.00/)).toBeDefined();
  });

  it('displays selected count', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onRefund={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Lomo Saltado'));
    expect(screen.getByText('1 de 3 item(s) seleccionado(s)')).toBeDefined();
  });

  it('toggles item selection on click', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onRefund={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Lomo Saltado'));
    expect(screen.getByText(/1 de 3/)).toBeDefined();
    fireEvent.click(screen.getByText('Lomo Saltado'));
    expect(screen.queryByText(/1 de 3/)).toBeNull();
  });

  it('calls onRefund with selected item indices and reason', async () => {
    const onRefund = vi.fn().mockResolvedValue({ success: true });
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onRefund={onRefund} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Lomo Saltado'));
    fireEvent.click(screen.getByText('Chicha Morada'));
    const textarea = screen.getByPlaceholderText(/reembolsan/);
    fireEvent.change(textarea, { target: { value: 'No les gustó' } });
    fireEvent.click(getActionButton());
    await waitFor(() => {
      expect(onRefund).toHaveBeenCalledWith('ord-cancel-test-1', [0, 1], 'No les gustó');
    });
  });

  it('shows full cancel UI when no items are selected (even with onRefund)', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onRefund={vi.fn()} onClose={vi.fn()} />);
    // No items selected -> title says "Cancelar Orden", not "Reembolso Parcial"
    expect(screen.queryByText('Reembolso Parcial')).toBeNull();
    expect(screen.getAllByText('Cancelar Orden').length).toBeGreaterThanOrEqual(1);
  });

  it('shows warning header strip when in partial refund mode', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onRefund={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Lomo Saltado'));
    expect(screen.getByText('Reembolso Parcial')).toBeDefined();
  });

  it('shows correct subtotal when multiple items selected', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onRefund={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Lomo Saltado')); // 28
    fireEvent.click(screen.getByText('Chicha Morada')); // 2*12 = 24
    expect(screen.getByText(/52\.00/)).toBeDefined();
  });

  it('shows partial refund placeholder text', () => {
    render(<CancelOrderModal order={mockOrder} onCancel={vi.fn()} onRefund={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Lomo Saltado'));
    expect(screen.getByPlaceholderText(/reembolsan estos items/)).toBeDefined();
  });

  it('single item order works with partial refund', () => {
    render(<CancelOrderModal order={singleItemOrder} onCancel={vi.fn()} onRefund={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Ceviche')).toBeDefined();
    fireEvent.click(screen.getByText('Ceviche'));
    expect(screen.getByText(/1 de 1/)).toBeDefined();
    expect(screen.getAllByText(/15\.00/).length).toBeGreaterThanOrEqual(1);
  });

  it('empty items order does not show selection', () => {
    render(<CancelOrderModal order={emptyItemsOrder} onCancel={vi.fn()} onRefund={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText(/Seleccioná los items/)).toBeNull();
    expect(screen.getAllByText('Cancelar Orden').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onCancel when no items selected even with onRefund', async () => {
    const onCancel = vi.fn().mockResolvedValue({ success: true });
    const onRefund = vi.fn();
    render(<CancelOrderModal order={mockOrder} onCancel={onCancel} onRefund={onRefund} onClose={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Explica detalladamente/);
    fireEvent.change(textarea, { target: { value: 'Cancelar todo' } });
    fireEvent.click(getActionButton());
    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledWith('ord-cancel-test-1', 'Cancelar todo');
      expect(onRefund).not.toHaveBeenCalled();
    });
  });
});
