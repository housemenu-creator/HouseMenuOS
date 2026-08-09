import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';

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
  }),
}));

vi.mock('../../context/MarketingContext', () => ({
  useMarketing: () => ({
    activeCampaigns: [],
    stats: { deliveriesCount: 1240, averageRating: 4.9 },
  }),
}));

// ── Firebase mocks ─────────────────────────────────────────
vi.mock('@house/db', () => ({ realtimeDB: {}, app: {} }));
vi.mock('firebase/database', () => ({
  ref: vi.fn(() => ({ key: 'root' })),
  onValue: vi.fn(() => () => {}),
  off: vi.fn(),
  get: vi.fn(() => Promise.resolve({ val: () => null, exists: () => false })),
  set: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => Promise.resolve()),
}));

// ── Asset mocks ────────────────────────────────────────────
vi.mock('../../assets/logo.jpg', () => ({ default: 'logo.jpg' }));

// ── Child component mocks ──────────────────────────────────
vi.mock('../../customer/components/HeroBanner', () => ({ default: () => null }));
vi.mock('../../customer/components/FlashOffer', () => ({ default: () => null }));
vi.mock('../../customer/components/MarketingHighlights', () => ({ default: () => null }));
vi.mock('../../customer/components/UrgencyBar', () => ({ default: () => null }));
vi.mock('../../customer/components/CampaignBanner', () => ({ default: () => null }));
vi.mock('../../components/CustomerAuthModal', () => ({ default: () => null }));

// ── Tests ──────────────────────────────────────────────────

describe('LandingView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const Page = (await import('../LandingView')).default;
    const { container } = renderWithProviders(<Page />);
    expect(container).toBeTruthy();
  });

  it('shows the HOUSE heading', async () => {
    const Page = (await import('../LandingView')).default;
    renderWithProviders(<Page />);
    expect(screen.getByText('HOUSE')).toBeTruthy();
  });
});
