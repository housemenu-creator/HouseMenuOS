import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RoleCard from '../RoleCard';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

describe('RoleCard', () => {
  const baseProps = {
    title: 'Cocina',
    description: 'Gestionar pedidos en cocina',
    icon: <span data-testid="test-icon">🍳</span>,
    route: '/staff/cocina',
  };

  beforeEach(() => { mockNavigate.mockClear(); });

  it('renders title and description', () => {
    render(<RoleCard {...baseProps} />);
    expect(screen.getByText('Cocina')).toBeDefined();
    expect(screen.getByText('Gestionar pedidos en cocina')).toBeDefined();
  });

  it('renders icon', () => {
    render(<RoleCard {...baseProps} />);
    expect(screen.getByTestId('test-icon')).toBeDefined();
  });

  it('renders kpi when provided', () => {
    render(<RoleCard {...baseProps} kpi="12 pedidos activos" />);
    expect(screen.getByText('12 pedidos activos')).toBeDefined();
  });

  it('does not render kpi section when kpi is undefined', () => {
    render(<RoleCard {...baseProps} />);
    expect(screen.queryByText('12 pedidos activos')).toBeNull();
  });

  it('navigates on click', () => {
    render(<RoleCard {...baseProps} />);
    fireEvent.click(screen.getByText('Cocina'));
    expect(mockNavigate).toHaveBeenCalledWith('/staff/cocina');
  });

  it('applies custom color class', () => {
    const { container } = render(<RoleCard {...baseProps} color="from-red-500" />);
    const gradientDiv = container.querySelector('.from-red-500');
    expect(gradientDiv).toBeDefined();
  });

  it('uses default color when not provided', () => {
    const { container } = render(<RoleCard {...baseProps} />);
    const gradientDiv = container.querySelector('.from-cm-accent');
    expect(gradientDiv).toBeDefined();
  });
});
