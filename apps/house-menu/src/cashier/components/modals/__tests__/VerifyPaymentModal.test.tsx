import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VerifyPaymentModal } from '../VerifyPaymentModal';
import type { Order } from '../../../types';

const mockOrder: Order = {
  id: 'ord-xyz789',
  customerName: 'Carlos',
  status: 'recibido',
  payment_status: 'por_verificar',
  financials: { total: 32.0 },
  payment_details: {
    wallet_type: 'Yape',
    operation_number: 'OP-12345',
  },
};

describe('VerifyPaymentModal', () => {
  it('renders order info and payment details', () => {
    render(<VerifyPaymentModal order={mockOrder} onVerify={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/XYZ789/)).toBeDefined();
    expect(screen.getByText(/Carlos/)).toBeDefined();
    expect(screen.getByText(/Yape/)).toBeDefined();
    expect(screen.getByText(/OP-12345/)).toBeDefined();
  });

  it('calls onVerify', () => {
    const onVerify = vi.fn().mockResolvedValue({ success: true });
    render(<VerifyPaymentModal order={mockOrder} onVerify={onVerify} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/Confirmar Pago/));
    expect(onVerify).toHaveBeenCalledWith('ord-xyz789');
  });

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(<VerifyPaymentModal order={mockOrder} onVerify={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
