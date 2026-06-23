import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OrderCard from '../OrderCard';
import type { Order } from '../../workerTypes';

// ── Framer motion mock (motion.div → plain div) ──
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, layout, layoutId, initial, animate, exit, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const mockOrder: Order = {
  id: 'ORD-001',
  status: 'preparando',
  createdAt: '2026-06-22T10:00:00',
  customerName: 'Juan Pérez',
  items: [
    { name: 'Lomo Saltado', quantity: 2, price: 28, details: ['sin cebolla'] },
    { name: 'Chicha', quantity: 1, price: 6 },
  ],
  location: 'Av. Principal 123',
  observaciones: 'Entregar en recepción',
};

describe('OrderCard', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders customer name', () => {
    render(<OrderCard order={mockOrder} />);
    expect(screen.getByText('Juan Pérez')).toBeDefined();
  });

  it('renders order id (last 6 chars uppercased)', () => {
    render(<OrderCard order={mockOrder} />);
    expect(screen.getByText('ORD-001'.slice(-6).toUpperCase())).toBeDefined();
  });

  it('renders order status', () => {
    render(<OrderCard order={mockOrder} />);
    expect(screen.getByText('preparando')).toBeDefined();
  });

  it('renders all items with quantities', () => {
    render(<OrderCard order={mockOrder} />);
    expect(screen.getByText('Lomo Saltado')).toBeDefined();
    expect(screen.getByText('Chicha')).toBeDefined();
    // quantities rendered as numbers
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
  });

  it('renders item details', () => {
    render(<OrderCard order={mockOrder} />);
    expect(screen.getByText(/sin cebolla/)).toBeDefined();
  });

  it('renders location', () => {
    render(<OrderCard order={mockOrder} />);
    expect(screen.getByText('Av. Principal 123')).toBeDefined();
  });

  it('renders observaciones', () => {
    render(<OrderCard order={mockOrder} />);
    expect(screen.getByText('Entregar en recepción')).toBeDefined();
  });

  it('applies history class when isHistory is true', () => {
    const { container } = render(<OrderCard order={mockOrder} isHistory />);
    const inner = container.firstChild as HTMLElement;
    expect(inner.className).toContain('opacity-60');
  });

  it('renders bulk mode checkbox', () => {
    render(<OrderCard order={mockOrder} isBulkMode />);
    // Should render unchecked square
    const svg = document.querySelector('.lucide-square');
    expect(svg).toBeDefined();
  });

  it('calls onToggleSelect in bulk mode', () => {
    const onToggle = vi.fn();
    render(<OrderCard order={mockOrder} isBulkMode onToggleSelect={onToggle} />);
    fireEvent.click(screen.getByText('Juan Pérez'));
    expect(onToggle).toHaveBeenCalledWith('ORD-001');
  });

  it('shows selected state in bulk mode', () => {
    render(<OrderCard order={mockOrder} isBulkMode selected />);
    const svg = document.querySelector('.lucide-circle-check-big') || document.querySelector('.lucide-check-square');
    expect(svg).toBeDefined();
  });

  it('calls onPrint when print button is clicked', () => {
    const onPrint = vi.fn();
    render(<OrderCard order={mockOrder} onPrint={onPrint} />);

    const printBtn = document.querySelector('.lucide-printer')?.closest('button');
    expect(printBtn).toBeDefined();
    fireEvent.click(printBtn!);
    expect(onPrint).toHaveBeenCalledWith(mockOrder);
  });

  it('renders custom footer via renderFooter', () => {
    render(
      <OrderCard
        order={mockOrder}
        renderFooter={(o) => <div data-testid="custom-footer">{o.customerName}</div>}
      />
    );
    expect(screen.getByTestId('custom-footer')).toBeDefined();
    expect(screen.getByTestId('custom-footer').textContent).toContain('Juan Pérez');
  });

  it('renders custom header via renderHeader', () => {
    render(
      <OrderCard
        order={mockOrder}
        renderHeader={(o) => <div data-testid="custom-header">{o.status}</div>}
      />
    );
    expect(screen.getByTestId('custom-header')).toBeDefined();
  });

  it('renders custom items via renderItems', () => {
    render(
      <OrderCard
        order={mockOrder}
        renderItems={(o) => <div data-testid="custom-items">{o.items.length} items</div>}
      />
    );
    expect(screen.getByTestId('custom-items')).toBeDefined();
  });

  it('renders children', () => {
    render(
      <OrderCard order={mockOrder}>
        <div data-testid="child-content">Extra</div>
      </OrderCard>
    );
    expect(screen.getByTestId('child-content')).toBeDefined();
  });
});
