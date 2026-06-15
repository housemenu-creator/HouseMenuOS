import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import KDSColumn from '../KDSColumn';

// framer-motion Reorder works in jsdom for basic rendering
// but we wrap children in simple divs for test simplicity
function TestChild({ id }) {
  return <div data-testid="ticket">{id}</div>;
}

describe('KDSColumn', () => {
  it('renders title and count', () => {
    render(
      <KDSColumn title="Nuevos" status="recibido" count={3}>
        <TestChild id="a" />
      </KDSColumn>
    );
    expect(screen.getByText('Nuevos')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    // Status text ya no se renderiza como label — se reemplazó por ícono + color strip
  });

  it('renders children when count > 0', () => {
    render(
      <KDSColumn title="Nuevos" status="recibido" count={1}>
        <TestChild id="ord-1" />
      </KDSColumn>
    );
    expect(screen.getByTestId('ticket')).toBeDefined();
  });

  it('shows empty state when count is 0', () => {
    render(
      <KDSColumn title="Nuevos" status="recibido" count={0}>
        <TestChild id="a" />
      </KDSColumn>
    );
    expect(screen.getByText('Sin pedidos')).toBeDefined();
    // children should not render when count is 0
    expect(screen.queryByTestId('ticket')).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(
      <KDSColumn title="Nuevos" status="recibido" count={0} className="custom-class">
        <TestChild id="a" />
      </KDSColumn>
    );
    const col = container.firstChild;
    expect(col.className).toContain('custom-class');
  });

  it('renders with preparando status styling', () => {
    render(
      <KDSColumn title="Preparando" status="preparando" count={2}>
        <TestChild id="a" />
      </KDSColumn>
    );
    expect(screen.getByText('Preparando')).toBeDefined();
    // Status text ya no se renderiza como label
  });

  it('renders with listo status styling', () => {
    render(
      <KDSColumn title="Listos" status="listo" count={5}>
        <TestChild id="a" />
      </KDSColumn>
    );
    expect(screen.getByText('Listos')).toBeDefined();
    // Status text ya no se renderiza como label
  });
});
