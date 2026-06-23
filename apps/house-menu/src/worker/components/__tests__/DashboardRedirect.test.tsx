import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import DashboardRedirect from '../DashboardRedirect';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockUser = { role: 'mozo' };

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe('DashboardRedirect', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('navigates to role-specific dashboard on mount', () => {
    mockUser.role = 'mozo';
    render(<DashboardRedirect />);
    expect(mockNavigate).toHaveBeenCalledWith('/staff/mozo/dashboard', { replace: true });
  });

  it('navigates to mozo dashboard for repartidor role', () => {
    mockUser.role = 'repartidor';
    render(<DashboardRedirect />);
    expect(mockNavigate).toHaveBeenCalledWith('/staff/repartidor/dashboard', { replace: true });
  });

  it('falls back to mozo when user has no role', () => {
    mockUser.role = undefined;
    render(<DashboardRedirect />);
    expect(mockNavigate).toHaveBeenCalledWith('/staff/mozo/dashboard', { replace: true });
  });
});
