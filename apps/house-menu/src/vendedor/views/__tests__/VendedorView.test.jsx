import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/test-utils';

// ── Firebase mock ──────────────────────────────────────────
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn((_db, path) => ({ path })),
  onValue: vi.fn((_ref, cb) => {
    cb({ val: () => ({}), exists: () => true });
    return () => {};
  }),
  set: vi.fn(),
  update: vi.fn(),
  push: vi.fn(() => ({ key: 'mock-key' })),
  get: vi.fn(() => Promise.resolve({ val: () => null })),
  off: vi.fn(),
  serverTimestamp: vi.fn(() => new Date().toISOString()),
}));

vi.mock('@house/db', () => ({ realtimeDB: {}, app: {} }));

vi.mock('../../../lib/ordersService', () => ({
  ordersService: {},
}));

// ── Context mocks ──────────────────────────────────────────
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'vendedor@test.com', name: 'Vendedor', role: 'vendedor' }, logout: vi.fn() }),
}));

vi.mock('../../../context/BranchContext', () => ({
  useBranch: () => ({ activeBranchId: 'branch-1', branches: [{ id: 'branch-1', name: 'Principal' }] }),
}));

// ── Hook mocks ─────────────────────────────────────────────
vi.mock('../../../hooks/useAccessibleBranches', () => ({
  useAccessibleBranches: () => ({ branches: [], loading: false }),
}));

vi.mock('../../../worker/hooks/useOrderSync', () => ({
  default: () => {},
}));

vi.mock('../../hooks/useVendedorSync', () => ({
  default: () => {},
  useCuentaStats: () => ({ totalCuentas: 0, totalDeuda: 0 }),
  useOrdersByCuentaId: () => ({ orders: [], loading: false }),
}));

vi.mock('../store/vendedorStore', () => ({
  default: (selector) => {
    const state = { cuentas: [], selectedCuenta: null, searchTerm: '' };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../../../worker/store/orderStore', () => ({
  default: (selector) => {
    const state = { orders: {}, orderIndex: [], activeOrders: [] };
    return selector ? selector(state) : state;
  },
}));

// ── Child component mocks ──────────────────────────────────
vi.mock('../../../components/BranchSwitcher', () => ({
  default: () => null,
}));

vi.mock('../../components/VendedorDashboard', () => ({
  default: () => null,
}));

vi.mock('../../components/CuentaDetail', () => ({
  default: () => null,
}));

describe('VendedorView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const VendedorView = (await import('../VendedorView')).default;
    const { container } = renderWithProviders(<VendedorView />);
    expect(container).toBeTruthy();
  });

  it('renders the Ventas heading', async () => {
    const VendedorView = (await import('../VendedorView')).default;
    renderWithProviders(<VendedorView />);
    expect(screen.getAllByText(/Ventas/i).length).toBeGreaterThan(0);
  });
});
