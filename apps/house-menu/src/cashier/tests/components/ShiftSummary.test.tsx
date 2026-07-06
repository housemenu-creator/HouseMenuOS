import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShiftSummary } from '../../components/widgets/ShiftSummary';
import type { KPIs } from '../../services/calculator';

const baseProps = {
  openingBalance: 200,
  totalEfectivo: 150,
  totalYapePlin: 80,
  totalPos: 45,
  totalIngresos: 275,
  expectedCash: 350,
  paidCount: 12,
  cancelledCount: 2,
  openedAt: 1720000000000,
};

describe('ShiftSummary', () => {
  it('renders basic shift info', () => {
    render(<ShiftSummary {...baseProps} />);
    expect(screen.getByText('Resumen de Turno')).toBeDefined();
    expect(screen.getByText(/200\.00/)).toBeDefined();
    expect(screen.getByText(/150\.00/)).toBeDefined();
    expect(screen.getByText(/275\.00/)).toBeDefined();
    expect(screen.getByText('12 cobros')).toBeDefined();
    expect(screen.getByText('2 cancelaciones')).toBeDefined();
  });

  it('shows difference when closingBalance provided', () => {
    render(<ShiftSummary {...baseProps} closingBalance={340} />);
    expect(screen.getByText(/-10\.00/)).toBeDefined();
  });

  it('shows positive difference with plus sign', () => {
    render(<ShiftSummary {...baseProps} closingBalance={360} />);
    expect(screen.getByText(/\+10\.00/)).toBeDefined();
  });

  it('shows zero difference', () => {
    render(<ShiftSummary {...baseProps} closingBalance={350} />);
    // +0.00 is displayed for zero diff (green)
    expect(screen.getByText(/\+0\.00/)).toBeDefined();
  });

  it('shows export buttons when kpis provided', () => {
    render(<ShiftSummary {...baseProps} kpis={{} as KPIs} />);
    expect(screen.getByText('CSV')).toBeDefined();
    expect(screen.getByText('TXT')).toBeDefined();
  });

  it('hides export buttons without kpis', () => {
    render(<ShiftSummary {...baseProps} />);
    expect(screen.queryByText('CSV')).toBeNull();
    expect(screen.queryByText('TXT')).toBeNull();
  });
});
