import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiGrid } from '../../components/widgets/KpiGrid';

const defaultProps = {
  totalEfectivo: 100,
  totalYapePlin: 50,
  totalPos: 30,
  totalPendiente: 20,
  totalPorVerificar: 10,
  totalIngresos: 180,
  expectedCash: 280,
  paidCount: 15,
  averageTicket: 12,
};

describe('KpiGrid', () => {
  it('renders all KPI cards with formatted values', () => {
    render(<KpiGrid {...defaultProps} />);
    expect(screen.getByText('S/ 100.00')).toBeDefined();
    expect(screen.getByText('S/ 50.00')).toBeDefined();
    expect(screen.getByText('S/ 30.00')).toBeDefined();
    expect(screen.getByText('S/ 20.00')).toBeDefined();
    expect(screen.getByText('S/ 10.00')).toBeDefined();
    expect(screen.getByText('S/ 180.00')).toBeDefined();
  });

  it('renders label text for each card', () => {
    render(<KpiGrid {...defaultProps} />);
    expect(screen.getByText('Efectivo')).toBeDefined();
    expect(screen.getByText('Yape/Plin')).toBeDefined();
    expect(screen.getByText('Tarjeta')).toBeDefined();
    expect(screen.getByText('Pendiente')).toBeDefined();
    expect(screen.getByText('Por Verificar')).toBeDefined();
    expect(screen.getByText('Total')).toBeDefined();
  });

  it('renders paid count and average ticket for total card', () => {
    render(<KpiGrid {...defaultProps} />);
    expect(screen.getByText('(15 ops)')).toBeDefined();
    expect(screen.getByText(/Ticket prom/)).toBeDefined();
    expect(screen.getByText(/12\.00/)).toBeDefined();
  });

  it('renders with zero values when no data', () => {
    render(<KpiGrid
      totalEfectivo={0} totalYapePlin={0} totalPos={0}
      totalPendiente={0} totalPorVerificar={0} totalIngresos={0}
      expectedCash={0} paidCount={0} averageTicket={0}
    />);
    const zeroTexts = screen.getAllByText('S/ 0.00');
    expect(zeroTexts.length).toBeGreaterThanOrEqual(6);
  });
});
