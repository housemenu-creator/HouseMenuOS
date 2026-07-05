import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CashierDisplay } from '../../components/CashierDisplay';

describe('CashierDisplay', () => {
  it('renders total mode with amount and item count', () => {
    render(<CashierDisplay total={64.0} itemCount={3} mode="total" />);
    expect(screen.getByText('TOTAL')).toBeTruthy();
    expect(screen.getByText('64.00')).toBeTruthy();
    expect(screen.getByText('3 ARTÍCULOS')).toBeTruthy();
  });

  it('renders singular ARTÍCULO for 1 item', () => {
    render(<CashierDisplay total={20.0} itemCount={1} mode="total" />);
    expect(screen.getByText('1 ARTÍCULO')).toBeTruthy();
  });

  it('renders payment mode with change', () => {
    render(<CashierDisplay total={30.0} itemCount={0} mode="payment" change={8.5} />);
    expect(screen.getByText('VUELTO')).toBeTruthy();
    expect(screen.getByText('8.50')).toBeTruthy();
  });

  it('renders payment mode without change', () => {
    render(<CashierDisplay total={25.0} itemCount={0} mode="payment" />);
    expect(screen.getByText('TOTAL A PAGAR')).toBeTruthy();
  });

  it('renders idle mode', () => {
    render(<CashierDisplay total={0} itemCount={0} mode="idle" />);
    expect(screen.getByText('LISTO')).toBeTruthy();
  });

  it('renders closed mode', () => {
    render(<CashierDisplay total={0} itemCount={0} mode="closed" />);
    expect(screen.getByText('CAJA CERRADA')).toBeTruthy();
  });

  it('applies display CSS class', () => {
    const { container } = render(<CashierDisplay total={50} itemCount={2} mode="total" />);
    const display = container.querySelector('.cashier-display');
    expect(display).toBeTruthy();
  });

  it('displays custom status text and clock', () => {
    render(
      <CashierDisplay
        total={0}
        itemCount={0}
        mode="idle"
        statusText="ABIERTO"
        clock="12:30:00"
      />
    );
    expect(screen.getByText('ABIERTO')).toBeTruthy();
    expect(screen.getByText('12:30:00')).toBeTruthy();
  });
});
