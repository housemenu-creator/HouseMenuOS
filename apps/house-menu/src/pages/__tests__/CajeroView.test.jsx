import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';

// ── Context mocks ──────────────────────────────────────────
const mockUser = { email: 'cajero@test.com', name: 'Cajero Test', role: 'cajero', uid: 'uid-123' };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: vi.fn() }),
}));

vi.mock('../../context/BranchContext', () => ({
  useBranch: () => ({
    activeBranchId: 'branch-1',
    branches: [{ id: 'branch-1', name: 'Sucursal Central' }],
  }),
}));

vi.mock('../../components/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

// ── Service mocks (avoid Firebase dependency chain) ────────
vi.mock('../../lib/ordersService', () => ({
  ordersService: {
    subscribeToOrders: vi.fn(() => () => {}),
    createOrder: vi.fn(),
  },
}));

vi.mock('../../lib/cashService', () => ({
  cashService: {
    subscribeToSessions: vi.fn(() => () => {}),
    getSessions: vi.fn(() => Promise.resolve([])),
    openSession: vi.fn(),
    closeSession: vi.fn(),
    getCurrentSession: vi.fn(() => Promise.resolve(null)),
  },
}));

vi.mock('../../lib/format', () => ({
  formatCurrency: (v) => `S/ ${Number(v).toFixed(2)}`,
  formatTime: (d) => d ? new Date(d).toLocaleTimeString('es-PE') : '--:--',
}));

vi.mock('../../hooks/useFCM', () => ({
  useFCM: () => {},
}));

// ── Component mocks ────────────────────────────────────────
vi.mock('../../components/NotificationBell', () => ({
  default: () => null,
}));

vi.mock('../../lib/notificationSound', () => ({
  playChime: vi.fn(),
}));

// ── Tests ──────────────────────────────────────────────────

describe('CajeroView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const CajeroView = (await import('../CajeroView')).default;
    const { container } = renderWithProviders(<CajeroView />);
    expect(container).toBeTruthy();
  });

  it('shows loading state initially', async () => {
    const CajeroView = (await import('../CajeroView')).default;
    renderWithProviders(<CajeroView />);
    // The component should render something (loading state)
    expect(screen.getByText(/Caja/i)).toBeTruthy();
  });
});
