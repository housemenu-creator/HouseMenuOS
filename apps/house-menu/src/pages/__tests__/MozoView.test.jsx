import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';

// ── Firebase mocks ──────────────────────────────────────────
vi.mock('firebase/database', () => ({
  ref: vi.fn(() => ({})),
  onValue: vi.fn((_ref, cb) => { cb({ val: () => null }); return () => {}; }),
}));

vi.mock('@house/db', () => ({
  realtimeDB: {},
  app: {},
}));

// ── Context mocks ──────────────────────────────────────────
const mockUser = { email: 'mozo@test.com', name: 'Mozo Test', role: 'mozo', uid: 'uid-123' };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: vi.fn() }),
}));

vi.mock('../../context/BranchContext', () => ({
  useBranch: () => ({
    activeBranchId: 'branch-1',
    branches: [{ id: 'branch-1', name: 'Sucursal Central' }],
    setActiveBranchId: vi.fn(),
  }),
}));

// ── Service mocks ──────────────────────────────────────────
vi.mock('../../lib/ordersService', () => ({
  ordersService: {
    updateOrderStatus: vi.fn(),
  },
}));

vi.mock('../../lib/menuService', () => ({
  menuService: {
    subscribeToCatalog: vi.fn(() => () => {}),
  },
}));

// ── Hook mocks ────────────────────────────────────────────
vi.mock('../../hooks/useAccessibleBranches', () => ({
  useAccessibleBranches: () => [],
}));

vi.mock('../../worker/hooks/useOrderSync', () => ({
  default: () => {},
}));

vi.mock('../../mozo/hooks/useMozoOrders', () => ({
  useMozoOrders: () => [],
}));

// ── Store mocks (Zustand) ─────────────────────────────────
vi.mock('../../worker/store/orderStore', () => ({
  default: (selector) => {
    const state = { isLoading: false, orders: {}, orderIndex: [] };
    return selector ? selector(state) : state;
  },
}));

// ── Component mocks ────────────────────────────────────────
vi.mock('../../components/BranchSwitcher', () => ({
  default: () => null,
}));

vi.mock('../../mozo/components/NewOrderModal', () => ({
  default: () => null,
}));

vi.mock('../../mozo/components/CobrarModal', () => ({
  default: () => null,
}));

vi.mock('../../mozo/components/MozoOrderList', () => ({
  default: () => null,
}));

// ── Tests ──────────────────────────────────────────────────
describe('MozoView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const MozoView = (await import('../MozoView')).default;
    const { container } = renderWithProviders(<MozoView />);
    expect(container).toBeTruthy();
  });

  it('shows heading', async () => {
    const MozoView = (await import('../MozoView')).default;
    renderWithProviders(<MozoView />);
    expect(screen.getByText(/Mozo/i)).toBeTruthy();
  });
});
