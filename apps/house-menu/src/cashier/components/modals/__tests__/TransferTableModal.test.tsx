import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransferTableModal } from '../TransferTableModal';
import type { Order } from '../../../types';

const mockOrder: Order = {
  id: 'ord-def456',
  customerName: 'María',
  mesa: '3',
  status: 'recibido',
  payment_status: 'pagado',
};

describe('TransferTableModal', () => {
  it('renders order info', () => {
    render(<TransferTableModal order={mockOrder} onTransfer={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/DEF456/)).toBeDefined();
    expect(screen.getByText(/María/)).toBeDefined();
    expect(screen.getByText(/Mesa 3/)).toBeDefined();
  });

  it('renders table grid when tables provided', () => {
    render(<TransferTableModal order={mockOrder} tables={[1, 2, 3, 4, 5]} onTransfer={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('calls onTransfer with target table', () => {
    const onTransfer = vi.fn().mockResolvedValue(undefined);
    render(<TransferTableModal order={mockOrder} tables={[1, 2, 3]} onTransfer={onTransfer} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('2'));
    const btns = screen.getAllByText(/Transferir/);
    fireEvent.click(btns[btns.length - 1]); // last one is the button
    expect(onTransfer).toHaveBeenCalledWith('ord-def456', '2');
  });

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(<TransferTableModal order={mockOrder} onTransfer={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
