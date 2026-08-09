import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';

// ── Polyfills ───────────────────────────────────────────────
// IntersectionObserver is not available in JSDOM
vi.stubGlobal('IntersectionObserver', vi.fn(function() {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
}));

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
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}));

vi.mock('../../context/CustomerAuthContext', () => ({
  useCustomerAuth: () => ({ isAuthenticated: false, points: 0 }),
}));

vi.mock('../../context/TenantContext', () => ({
  useTenant: () => ({ slug: null, isPublicView: false }),
}));

vi.mock('../../context/BranchContext', () => ({
  useBranch: () => ({
    activeBranchId: 'branch-1',
    branches: [{ id: 'branch-1', name: 'Sucursal Central' }],
    setActiveBranchId: vi.fn(),
  }),
}));

// ── Store mocks ────────────────────────────────────────────
vi.mock('@house/store', () => ({
  useAppStore: (selector) => {
    const state = { cart: [], menuItems: [], categories: [], dailyMenus: [], loading: false, addToCart: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

// ── Service mocks ──────────────────────────────────────────
vi.mock('../../lib/menuService', () => ({
  menuService: {
    subscribeToCatalog: vi.fn((_branchId, callback) => {
      callback({ products: { p1: { name: 'Test', available: true, category: 'Bebidas', base_price: 10 } }, modifiers: {}, variations: {} });
      return () => {};
    }),
  },
}));

vi.mock('../../lib/dailyMenuService', () => ({
  dailyMenuService: {
    subscribeToDailyMenus: vi.fn((_branchId, callback) => {
      callback({});
      return () => {};
    }),
  },
}));

// ── Asset mocks ────────────────────────────────────────────
vi.mock('../../assets/logo.jpg', () => ({
  default: 'logo.jpg',
}));

// ── Component mocks ────────────────────────────────────────
vi.mock('../../components/EmptyState', () => ({
  default: () => null,
}));

vi.mock('../../components/MenuCard', () => ({
  default: () => null,
}));

vi.mock('../../components/DateSelector', () => ({
  default: () => null,
}));

vi.mock('../../customer/components/SearchBar', () => ({
  default: () => null,
}));

vi.mock('../../customer/components/CategoryRibbon', () => ({
  default: () => null,
}));

vi.mock('../../customer/components/ProductGrid', () => ({
  default: () => null,
}));

vi.mock('../../customer/components/BentoDailyMenu', () => ({
  default: () => null,
}));

vi.mock('../../customer/components/MarketingHighlights', () => ({
  default: () => null,
}));

vi.mock('../../customer/components/UrgencyBar', () => ({
  default: () => null,
}));

vi.mock('../../customer/components/ProductSkeleton', () => ({
  default: () => null,
}));

vi.mock('../../customer/components/HeroBanner', () => ({
  default: () => null,
}));

vi.mock('../../customer/components/CampaignBanner', () => ({
  default: () => null,
}));

vi.mock('../../components/CustomerAuthModal', () => ({
  default: () => null,
}));

vi.mock('../../customer/components/FlashOffer', () => ({
  default: () => null,
}));

// ── Tests ──────────────────────────────────────────────────
describe('CustomerView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const CustomerView = (await import('../CustomerView')).default;
    const { container } = renderWithProviders(<CustomerView />);
    expect(container).toBeTruthy();
  });

  it('shows HOUSE header after loading', async () => {
    const CustomerView = (await import('../CustomerView')).default;
    renderWithProviders(<CustomerView />);
    // menuService callback fires → loading=false → nav bar with HOUSE renders
    expect(await screen.findByText(/HOUSE/i)).toBeTruthy();
  });
});
