import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KPISection from '../KPISection';

describe('KPISection', () => {
  const defaultProps = {
    kpis: { totalOrders: 15, totalRevenue: 450, avgOrderValue: 30, cancellations: 2 },
    currentTime: new Date('2026-06-20T15:30:00'),
  };

  it('renders total orders count', () => {
    render(<KPISection {...defaultProps} />);
    expect(screen.getByText('15')).toBeDefined();
  });

  it('renders total revenue', () => {
    render(<KPISection {...defaultProps} />);
    expect(screen.getByText(/450/)).toBeDefined();
  });

  it('renders average order value', () => {
    render(<KPISection {...defaultProps} />);
    expect(screen.getByText(/30/)).toBeDefined();
  });

  it('renders cancellation count', () => {
    render(<KPISection {...defaultProps} />);
    expect(screen.getByText('2')).toBeDefined();
  });

  it('renders the date badge', () => {
    render(<KPISection {...defaultProps} />);
    expect(screen.getByText(/jun\./i)).toBeDefined();
  });
});
