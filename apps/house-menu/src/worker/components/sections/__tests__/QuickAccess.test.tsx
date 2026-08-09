import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickAccess from '../QuickAccess';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('QuickAccess', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders Carta Digital and Rastrear links for non-admin roles', () => {
    render(<QuickAccess userRole="mozo" />);
    expect(screen.getByText('Carta Digital')).toBeDefined();
    expect(screen.getByText('Rastrear')).toBeDefined();
  });

  it('renders Panel Admin link for admin role', () => {
    render(<QuickAccess userRole="admin" />);
    expect(screen.getByText('Panel Admin')).toBeDefined();
  });

  it('hides Panel Admin link for non-admin roles', () => {
    render(<QuickAccess userRole="cajero" />);
    expect(screen.queryByText('Panel Admin')).toBeNull();
  });

  it('navigates when clicking Carta Digital', () => {
    render(<QuickAccess userRole="mozo" />);
    fireEvent.click(screen.getByText('Carta Digital'));
    expect(mockNavigate).toHaveBeenCalledWith('/carta');
  });

  it('navigates when clicking Rastrear', () => {
    render(<QuickAccess userRole="mozo" />);
    fireEvent.click(screen.getByText('Rastrear'));
    expect(mockNavigate).toHaveBeenCalledWith('/rastreo');
  });

  it('navigates when clicking Panel Admin', () => {
    render(<QuickAccess userRole="admin" />);
    fireEvent.click(screen.getByText('Panel Admin'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });
});
