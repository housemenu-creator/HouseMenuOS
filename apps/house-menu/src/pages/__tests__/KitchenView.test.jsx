import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';

// ── Context mocks ──────────────────────────────────────────
const mockUser = { email: 'kitchen@test.com', name: 'Kitchen Test', role: 'cocinero', uid: 'uid-456' };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: vi.fn() }),
}));

vi.mock('../../context/BranchContext', () => ({
  useBranch: () => ({ activeBranchId: 'branch-1' }),
}));

// ── Service mocks ──────────────────────────────────────────
vi.mock('../../lib/ordersService', () => ({
  ordersService: {
    subscribeToOrders: vi.fn(() => () => {}),
    createOrder: vi.fn(),
    updateOrderStatus: vi.fn(() => Promise.resolve({ success: true })),
    updateOrderPriority: vi.fn(() => Promise.resolve({ success: true })),
    batchUpdateOrderStatus: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

// ── Firebase mocks ─────────────────────────────────────────
vi.mock('@house/db', () => ({ realtimeDB: {}, app: {} }));

// ── KDS type/data mocks ────────────────────────────────────
vi.mock('../../kds/kdsTypes', () => ({
  KITCHEN_STATIONS: ['all', 'grill', 'fry', 'cold', 'bakery'],
  STATION_PREP_TIMES: { grill: 10, fry: 8, cold: 5, bakery: 12 },
}));

vi.mock('../../kds/utils/stationInference', () => ({
  inferStationFromItem: () => 'grill',
  inferOrderStation: () => 'grill',
}));

vi.mock('../../kds/utils/kitchenSound', () => ({
  playKitchenAlert: vi.fn(),
  getAudioContext: vi.fn(() => ({})),
}));

// ── Store mocks (Zustand) ──────────────────────────────────
vi.mock('../../worker/store/orderStore', () => {
  const state = { orders: {}, orderIndex: [], isLoading: false };
  const useStore = (selector) => (selector ? selector(state) : state);
  useStore.getState = () => state;
  return { default: useStore };
});

vi.mock('../../kds/store/timerStore', () => {
  const state = { stopTicker: vi.fn(), recalcVisible: vi.fn(), tickVisible: vi.fn() };
  const useStore = (selector) => (selector ? selector(state) : state);
  useStore.getState = () => state;
  return { default: useStore };
});

vi.mock('../../worker/store/catalogStore', () => ({
  default: (selector) => {
    const state = { products: [] };
    return selector ? selector(state) : state;
  },
}));

// ── Hook mocks ─────────────────────────────────────────────
vi.mock('../../worker/hooks/useOrderSync', () => ({ default: vi.fn() }));
vi.mock('../../worker/hooks/useCatalogSync', () => ({ default: vi.fn() }));
vi.mock('../../kds/hooks/useVoiceCommands', () => ({
  useVoiceCommands: () => ({ isListening: false, toggleListening: vi.fn(), transcript: '' }),
}));
vi.mock('../../kds/hooks/useUndoStack', () => ({
  default: () => ({ history: [], push: vi.fn(), undo: vi.fn(), canUndo: false }),
}));
vi.mock('../../kds/hooks/useNotifications', () => ({
  useNotifications: () => ({ foregroundMsg: null, dismissForeground: vi.fn() }),
}));
vi.mock('../../kds/hooks/useKDSKeyboard', () => ({ default: vi.fn() }));

// ── Child component mocks ──────────────────────────────────
vi.mock('../../kds/components/KDSColumn', () => ({ default: () => null }));
vi.mock('../../kds/components/KDSTicket', () => ({ default: () => null }));
vi.mock('../../components/Skeleton', () => ({ KDSSkeleton: () => null }));
vi.mock('../../components/EmptyState', () => ({ default: () => null }));
vi.mock('../../kds/components/StationFilter', () => ({ default: () => null }));
vi.mock('../../kds/components/BulkActionBar', () => ({ default: () => null }));
vi.mock('../../kds/components/ConnectionStatus', () => ({ default: () => null }));
vi.mock('../../kds/components/VoiceCommandBar', () => ({ default: () => null }));
vi.mock('../../kds/components/WorkflowSettings', () => ({ default: () => null }));
vi.mock('../../kds/components/StationSoundToggle', () => ({ default: () => null }));
vi.mock('../../kds/components/NewOrderFlash', () => ({ default: () => null }));
vi.mock('../../kds/components/BulkConfirmModal', () => ({ default: () => null }));
vi.mock('../../kds/components/HistoryPanel', () => ({ default: () => null }));
vi.mock('../../kds/components/UndoToast', () => ({ default: () => null }));
vi.mock('../../kds/components/ExpoPanel', () => ({ default: () => null }));
vi.mock('../../kds/components/DeliveryPanel', () => ({ default: () => null }));
vi.mock('../../kds/components/LiveStats', () => ({ default: () => null }));
vi.mock('../../kds/components/ConsolidatedPanel', () => ({ default: () => null }));
vi.mock('../../kds/components/InventoryPanel', () => ({ default: () => null }));

// ── Tests ──────────────────────────────────────────────────

describe('KitchenView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const Page = (await import('../KitchenView')).default;
    const { container } = renderWithProviders(<Page />);
    expect(container).toBeTruthy();
  });

  it('shows the KDS heading', async () => {
    const Page = (await import('../KitchenView')).default;
    renderWithProviders(<Page />);
    expect(screen.getByText(/KDS/)).toBeTruthy();
  });
});
