import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';

// ── Context mocks ──────────────────────────────────────────
const mockUser = { email: 'dispatch@test.com', name: 'Dispatch Test', role: 'dispatch', uid: 'uid-789' };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: vi.fn() }),
}));

vi.mock('../../context/BranchContext', () => ({
  useBranch: () => ({
    activeBranchId: 'branch-1',
    activeBranch: { id: 'branch-1', name: 'Sucursal Central', coordinates: { lat: -12.0464, lng: -77.0428 } },
    setActiveBranchId: vi.fn(),
  }),
}));

vi.mock('../../components/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

// ── Service mocks ──────────────────────────────────────────
vi.mock('../../lib/ordersService', () => ({
  ordersService: {
    subscribeToOrders: vi.fn(() => () => {}),
    updateOrderStatus: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

vi.mock('../../lib/deliveryService', () => ({
  deliveryService: {
    assignDriver: vi.fn(() => Promise.resolve({ success: true })),
    unassignDriver: vi.fn(() => Promise.resolve({ success: true })),
    confirmDelivery: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

// ── Notification mocks ─────────────────────────────────────
vi.mock('../../lib/notificationSound', () => ({
  playBeep: vi.fn(),
}));

vi.mock('../../lib/notificationService', () => ({
  createNotification: vi.fn(() => Promise.resolve()),
}));

// ── Firebase mocks ─────────────────────────────────────────
vi.mock('@house/db', () => ({ realtimeDB: {}, app: {} }));

// ── Hook mocks ─────────────────────────────────────────────
vi.mock('../../hooks/useAccessibleBranches', () => ({
  useAccessibleBranches: () => [{ id: 'b1', name: 'Test Branch' }],
}));

vi.mock('../../hooks/useFCM', () => ({
  useFCM: vi.fn(),
}));

vi.mock('../../worker/hooks/useOrderSync', () => ({ default: vi.fn() }));

vi.mock('../../dispatch/hooks/useDispatchOrders', () => ({
  useDispatchOrders: () => ({ listos: [], enCamino: [] }),
}));

vi.mock('../../dispatch/hooks/useDrivers', () => ({
  useDrivers: vi.fn(),
}));

// ── Store mocks (Zustand) ──────────────────────────────────
vi.mock('../../worker/store/orderStore', () => ({
  default: (selector) => {
    const state = { orders: {}, orderIndex: [], isLoading: false };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../../dispatch/store/deliveryStore', () => {
  const state = {
    drivers: [],
    sessionDeliveries: 0,
    addDelivery: vi.fn(),
    driverFilter: null,
    setDriverFilter: vi.fn(),
  };
  return { default: (selector) => (selector ? selector(state) : state) };
});

// ── Child component mocks ──────────────────────────────────
vi.mock('../../components/EmptyState', () => ({ default: () => null }));
vi.mock('../../components/BranchSwitcher', () => ({ default: () => null }));
vi.mock('../../components/NotificationBell', () => ({ default: () => null }));
vi.mock('../../dispatch/components/DriverAssignModal', () => ({ default: () => null }));
vi.mock('../../dispatch/components/ConfirmDeliveryModal', () => ({ default: () => null }));
vi.mock('../../dispatch/components/DispatchStats', () => ({ default: () => null }));
vi.mock('../../dispatch/components/DriverStatusBoard', () => ({ default: () => null }));
vi.mock('../../dispatch/components/DispatchOrderCard', () => ({ default: () => null }));
vi.mock('../../dispatch/components/LiveDriverMap', () => ({ default: () => null }));

// ── Tests ──────────────────────────────────────────────────

describe('DispatchView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const Page = (await import('../DispatchView')).default;
    const { container } = renderWithProviders(<Page />);
    expect(container).toBeTruthy();
  });

  it('shows the Despacho heading', async () => {
    const Page = (await import('../DispatchView')).default;
    renderWithProviders(<Page />);
    expect(screen.getByText(/Despacho/)).toBeTruthy();
  });
});
