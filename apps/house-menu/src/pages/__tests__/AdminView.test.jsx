import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';

// ── Firebase mocks ──────────────────────────────────────────
vi.mock('firebase/database', () => ({
  ref: vi.fn(() => ({})),
  onValue: vi.fn((_ref, cb) => { cb({ val: () => null }); return () => {}; }),
  set: vi.fn(),
}));

vi.mock('@house/db', () => ({
  realtimeDB: {},
  app: {},
}));

// ── Context mocks ──────────────────────────────────────────
const mockUser = { email: 'admin@test.com', name: 'Admin Test', role: 'admin', uid: 'uid-123' };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, can: () => true, logout: vi.fn() }),
}));

vi.mock('../../context/BranchContext', () => ({
  useBranch: () => ({
    activeBranchId: 'branch-1',
    branches: [{ id: 'branch-1', name: 'Sucursal Central' }],
    setActiveBranchId: vi.fn(),
  }),
}));

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

vi.mock('../../components/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

// ── Service mocks ──────────────────────────────────────────
vi.mock('../../lib/ordersService', () => ({
  ordersService: {
    subscribeToOrders: vi.fn((_branchId, callback) => {
      callback([]);
      return () => {};
    }),
    updateOrderStatus: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

vi.mock('../../lib/menuService', () => ({
  menuService: {
    subscribeToCatalog: vi.fn(() => () => {}),
    updateProductField: vi.fn(),
  },
}));

vi.mock('../../lib/cashService', () => ({
  cashService: {
    subscribeToSessions: vi.fn(() => () => {}),
  },
}));

vi.mock('../../lib/dailyMenuService', () => ({
  dailyMenuService: {
    subscribeToDailyMenus: vi.fn(() => () => {}),
  },
}));

// ── Lib mocks ─────────────────────────────────────────────
vi.mock('../../lib/roleRegistry', () => ({
  ROLE_REGISTRY: {
    admin: { adminTabs: ['dashboard', 'orders', 'menu', 'inventory', 'caja', 'finanzas', 'sucursales', 'delivery'] },
  },
}));

vi.mock('../../lib/notificationSound', () => ({
  playChime: vi.fn(),
}));

vi.mock('../../lib/notificationService', () => ({
  createNotification: vi.fn(),
}));

vi.mock('../../components/ConfirmDialog', () => ({
  confirmDialog: vi.fn(() => Promise.resolve(true)),
}));

// ── Hook mocks ────────────────────────────────────────────
vi.mock('../../hooks/useAccessibleBranches', () => ({
  useAccessibleBranches: () => [],
}));

vi.mock('../../hooks/useFCM', () => ({
  useFCM: () => {},
}));

// ── Component mocks ────────────────────────────────────────
vi.mock('../../admin/components/AdminMegaMenu', () => ({
  default: () => null,
}));

vi.mock('../../components/ErrorBoundary', () => ({
  default: (props) => props?.children || null,
}));

vi.mock('../../components/NotificationBell', () => ({
  default: () => null,
}));

// ── Tests ──────────────────────────────────────────────────
describe('AdminView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const AdminView = (await import('../AdminView')).default;
    const { container } = renderWithProviders(<AdminView />);
    expect(container).toBeTruthy();
  });

  it('shows heading after loading', async () => {
    const AdminView = (await import('../AdminView')).default;
    renderWithProviders(<AdminView />);
    // subscribeToOrders callback fires → loading=false → header with Admin Hub renders
    expect(await screen.findByText(/Admin Hub/i)).toBeTruthy();
  });
});
