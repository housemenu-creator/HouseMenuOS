import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';

// ── Hoisted mocks ──
const { mockNavigate, mockLocation, mockLogout, mockUserRole, setMockUserRole } = vi.hoisted(() => {
  let _role = 'mozo';
  return {
    mockNavigate: vi.fn(),
    mockLocation: vi.fn(() => ({ pathname: '/staff' })),
    mockLogout: vi.fn(),
    mockUserRole: { get role() { return _role; } },
    setMockUserRole: (r: string) => { _role = r; },
  };
});

// ── Router mock (partial) ──
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
  useLocation: mockLocation,
}));

// ── Framer motion mock ──
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  LayoutGroup: ({ children }: any) => <>{children}</>,
}));

// ── Branch Switcher mock ──
vi.mock('../BranchSwitcher', () => ({
  default: ({ variant }: any) => <div data-testid="BranchSwitcher">{variant}</div>,
}));

// ── Auth context mock ──
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Carlos', email: 'carlos@house.com', role: mockUserRole.role },
    logout: mockLogout,
  }),
}));

describe('StaffTopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockUserRole('mozo');
    mockLocation.mockReturnValue({ pathname: '/staff' });
  });

  it('renders logo and brand', async () => {
    const Bar = (await import('../StaffTopBar')).default;
    renderWithProviders(<Bar />);
    expect(screen.getByText('House')).toBeDefined();
  });

  it('renders role-specific navigation links for mozo', async () => {
    const Bar = (await import('../StaffTopBar')).default;
    renderWithProviders(<Bar />);
    expect(screen.getByText('Panel')).toBeDefined();
    expect(screen.getByText('Mozo')).toBeDefined();
    expect(screen.queryByText('Cocina')).toBeNull();
    expect(screen.queryByText('Despacho')).toBeNull();
  });

  it('renders Empleados link for admin', async () => {
    setMockUserRole('admin');

    const Bar = (await import('../StaffTopBar')).default;
    renderWithProviders(<Bar />);
    expect(screen.getByText('Empleados')).toBeDefined();
  });

  it('navigates when clicking a nav link', async () => {
    const Bar = (await import('../StaffTopBar')).default;
    renderWithProviders(<Bar />);
    fireEvent.click(screen.getByText('Mozo'));
    expect(mockNavigate).toHaveBeenCalledWith('/staff/mozo');
  });

  it('navigates to root when clicking logo', async () => {
    const Bar = (await import('../StaffTopBar')).default;
    renderWithProviders(<Bar />);
    fireEvent.click(screen.getByText('House'));
    expect(mockNavigate).toHaveBeenCalledWith('/staff');
  });

  it('renders BranchSwitcher', async () => {
    const Bar = (await import('../StaffTopBar')).default;
    renderWithProviders(<Bar />);
    expect(screen.getByTestId('BranchSwitcher')).toBeDefined();
  });

  it('renders user name', async () => {
    const Bar = (await import('../StaffTopBar')).default;
    renderWithProviders(<Bar />);
    expect(screen.getByText('Carlos')).toBeDefined();
  });

  it('calls logout on logout button click', async () => {
    const Bar = (await import('../StaffTopBar')).default;
    renderWithProviders(<Bar />);
    fireEvent.click(screen.getByTitle('Cerrar sesión'));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('renders slot content when provided', async () => {
    const Bar = (await import('../StaffTopBar')).default;
    renderWithProviders(<Bar slot={<div data-testid="slot-content">Slot</div>} />);
    expect(screen.getByTestId('slot-content')).toBeDefined();
  });
});
