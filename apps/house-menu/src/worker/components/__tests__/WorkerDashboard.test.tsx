import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../test/test-utils';

// ── Hoisted mocks ──
const { mockOnValue, mockUseOrderStore, mockComputeKPI, mockNavigate } = vi.hoisted(() => ({
  mockOnValue: vi.fn((_ref: any, cb: (snap: { val: () => any }) => void) => {
    cb({ val: () => null });
    return () => {};
  }),
  mockUseOrderStore: vi.fn(),
  mockComputeKPI: vi.fn(() => ({
    totalOrders: 12,
    totalRevenue: 380,
    avgOrderValue: 31.67,
    cancellations: 1,
  })),
  mockNavigate: vi.fn(),
}));

// ── React Router mock (partial — preserve MemoryRouter etc.) ──
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

// ── Context mocks ──
// Paths are relative to THIS test file: src/worker/components/__tests__/
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'Carlos', role: 'mozo' } }),
}));

vi.mock('../../../context/BranchContext', () => ({
  useBranch: () => ({ activeBranchId: 'branch-1', branches: [{ id: 'branch-1', name: 'Centro' }] }),
}));

// ── Firebase mocks ──
vi.mock('@house/db', () => ({ realtimeDB: {} }));
vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  onValue: mockOnValue,
}));

// ── Store mock ──
vi.mock('../../store/orderStore', () => ({
  default: mockUseOrderStore,
}));

vi.mock('../../../lib/employeeService', () => ({
  computeEmployeeKPI: mockComputeKPI,
}));

// ── Section component mocks ──
vi.mock('../sections/WelcomeHeader', () => ({
  default: () => <div data-testid="WelcomeHeader">Welcome</div>,
}));

vi.mock('../sections/AnnouncementBanner', () => ({
  default: () => <div data-testid="AnnouncementBanner">Announcement</div>,
}));

vi.mock('../sections/AttendanceCard', () => ({
  default: () => <div data-testid="AttendanceCard">Attendance</div>,
}));

vi.mock('../sections/OrderMetricsPanel', () => ({
  default: () => <div data-testid="OrderMetricsPanel">Metrics</div>,
}));

vi.mock('../sections/KPISection', () => ({
  default: () => <div data-testid="KPISection">KPI</div>,
}));

vi.mock('../sections/QuickAccess', () => ({
  default: () => <div data-testid="QuickAccess">QuickAccess</div>,
}));

// ── Setup default store values ──
function setupStore(overrides = {}) {
  const defaults = { orders: {}, orderIndex: [] };
  mockUseOrderStore.mockImplementation((selector: any) => {
    const state = { ...defaults, ...overrides };
    return selector(state);
  });
}

// ── Tests ──

describe('WorkerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  // ── Role-based section visibility ──

  it('renders all sections for mozo role', async () => {
    const Page = (await import('../WorkerDashboard')).default;
    renderWithProviders(<Page />);

    expect(screen.getByTestId('WelcomeHeader')).toBeDefined();
    expect(screen.getByTestId('AnnouncementBanner')).toBeDefined();
    expect(screen.getByTestId('AttendanceCard')).toBeDefined();
    expect(screen.getByTestId('OrderMetricsPanel')).toBeDefined();
    expect(screen.getByTestId('KPISection')).toBeDefined();
    expect(screen.getByTestId('QuickAccess')).toBeDefined();
  });

  it('renders mozo module card', async () => {
    const Page = (await import('../WorkerDashboard')).default;
    renderWithProviders(<Page />);

    expect(screen.getByText('Mozo / Mesas')).toBeDefined();
    expect(screen.queryByText('Cocina (KDS)')).toBeNull();
  });

  // ── Announcement subscription ──

  it('subscribes to announcement on mount', async () => {
    const Page = (await import('../WorkerDashboard')).default;
    renderWithProviders(<Page />);

    await waitFor(() => {
      expect(mockOnValue).toHaveBeenCalled();
    });
  });

  // ── Navigation ──

  it('navigates to mozo route when clicking module card', async () => {
    const Page = (await import('../WorkerDashboard')).default;
    renderWithProviders(<Page />);

    fireEvent.click(screen.getByText('Mozo / Mesas'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/staff/mozo');
    });
  });

  // ── KPI computation ──

  it('calls computeEmployeeKPI with order data', async () => {
    setupStore({
      orders: {
        o1: { id: 'o1', status: 'entregado', assignedTo: 'user-1' },
      },
      orderIndex: ['o1'],
    });

    const Page = (await import('../WorkerDashboard')).default;
    renderWithProviders(<Page />);

    await waitFor(() => {
      expect(mockComputeKPI).toHaveBeenCalled();
    });
  });
});
