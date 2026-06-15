import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LiveStats from '../LiveStats';

function makeOrder(id, status, overrides = {}) {
  return { id, status, items: [], pacingStatus: 'ahead', ...overrides };
}

describe('LiveStats', () => {
  const baseOrders = {
    a: makeOrder('a', 'recibido'),
    b: makeOrder('b', 'preparando'),
    c: makeOrder('c', 'listo'),
  };
  const baseIndex = ['a', 'b', 'c'];

  function badgeFor(label) {
    const badge = screen.getByText(label).closest('[class*="inline-flex"]');
    return badge?.textContent || '';
  }

  it('renders totals for each status group', () => {
    render(<LiveStats orders={baseOrders} orderIndex={baseIndex} />);
    expect(badgeFor('Activos')).toMatch(/3.*Activos/);
    expect(badgeFor('Nuevos')).toMatch(/1.*Nuevos/);
    expect(badgeFor('Cocinando')).toMatch(/1.*Cocinando/);
    expect(badgeFor('Listos')).toMatch(/1.*Listos/);
  });

  it('filters out entregado and cancelado orders', () => {
    const orders = {
      ...baseOrders,
      d: makeOrder('d', 'entregado'),
      e: makeOrder('e', 'cancelado'),
    };
    render(<LiveStats orders={orders} orderIndex={[...baseIndex, 'd', 'e']} />);
    expect(badgeFor('Activos')).toMatch(/3.*Activos/);
  });

  it('shows overdue badge when orders have overdue pacing status', () => {
    const orders = {
      a: makeOrder('a', 'recibido', { pacingStatus: 'overdue' }),
    };
    render(<LiveStats orders={orders} orderIndex={['a']} />);
    expect(screen.getByText('Atrasados')).toBeDefined();
    expect(badgeFor('Atrasados')).toMatch(/1.*Atrasados/);
  });

  it('hides overdue badge when no overdue orders', () => {
    render(<LiveStats orders={baseOrders} orderIndex={baseIndex} />);
    expect(screen.queryByText('Atrasados')).toBeNull();
  });

  it('handles empty orders', () => {
    render(<LiveStats orders={{}} orderIndex={[]} />);
    expect(badgeFor('Activos')).toMatch(/0.*Activos/);
    expect(badgeFor('Nuevos')).toMatch(/0.*Nuevos/);
    expect(badgeFor('Cocinando')).toMatch(/0.*Cocinando/);
    expect(badgeFor('Listos')).toMatch(/0.*Listos/);
  });

  it('handles large order counts', () => {
    const orders = {};
    const index = [];
    for (let i = 0; i < 15; i++) {
      const id = `ord-${i}`;
      orders[id] = makeOrder(id, 'recibido');
      index.push(id);
    }
    render(<LiveStats orders={orders} orderIndex={index} />);
    expect(badgeFor('Activos')).toMatch(/15.*Activos/);
    expect(badgeFor('Nuevos')).toMatch(/15.*Nuevos/);
  });
});
