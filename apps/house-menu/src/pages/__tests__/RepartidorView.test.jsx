import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';

// ── Context mocks ──────────────────────────────────────────
const mockUser = { email: 'repartidor@test.com', name: 'Repartidor Test', role: 'driver', uid: 'uid-123', id: 'uid-123' };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: vi.fn() }),
}));

vi.mock('../../context/BranchContext', () => ({
  useBranch: () => ({
    activeBranchId: 'branch-1',
    branches: [{ id: 'branch-1', name: 'Sucursal Central' }],
  }),
}));

// ── Service mocks ──────────────────────────────────────────
vi.mock('../../lib/ordersService', () => ({
  ordersService: {
    updateOrderStatus: vi.fn(),
  },
}));

vi.mock('../../lib/deliveryService', () => ({
  deliveryService: {
    updateDriver: vi.fn(() => Promise.resolve({ success: true })),
    confirmDelivery: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

// ── Hook mocks ────────────────────────────────────────────
vi.mock('../../worker/hooks/useOrderSync', () => ({
  default: () => {},
}));

vi.mock('../../delivery/hooks/useDriverIdentity', () => ({
  useDriverIdentity: () => ({ driverId: 'driver-1', driverName: 'Driver Test', loading: false }),
}));

vi.mock('../../delivery/hooks/useDriverDelivery', () => ({
  useDriverDelivery: () => [],
  useDriverStats: () => ({ delivered: 0, total: 0 }),
}));

vi.mock('../../delivery/hooks/useDriverGeolocation', () => ({
  useDriverGeolocation: () => {},
}));

vi.mock('../../hooks/useFCM', () => ({
  useFCM: () => {},
}));

// ── Store mocks (Zustand) ─────────────────────────────────
vi.mock('../../delivery/store/deliverySessionStore', () => ({
  default: (selector) => {
    const state = {
      isAvailable: true,
      setAvailability: vi.fn(),
      incrementCompleted: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

// ── Component mocks ────────────────────────────────────────
vi.mock('../../delivery/components/DeliveryCard', () => ({
  default: () => null,
}));

vi.mock('../../components/NotificationBell', () => ({
  default: () => null,
}));

// ── Lib mocks ─────────────────────────────────────────────
vi.mock('../../lib/notificationSound', () => ({
  playBeep: vi.fn(),
}));

// ── Tests ──────────────────────────────────────────────────
describe('RepartidorView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const RepartidorView = (await import('../RepartidorView')).default;
    const { container } = renderWithProviders(<RepartidorView />);
    expect(container).toBeTruthy();
  });

  it('shows heading', async () => {
    const RepartidorView = (await import('../RepartidorView')).default;
    renderWithProviders(<RepartidorView />);
    expect(screen.getByText(/Repartidor/i)).toBeTruthy();
  });
});
