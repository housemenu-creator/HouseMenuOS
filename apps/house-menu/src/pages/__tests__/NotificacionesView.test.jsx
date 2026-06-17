import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'user@test.com', name: 'Test User' } }),
}));

vi.mock('../../context/BranchContext', () => ({
  useBranch: () => ({ activeBranchId: 'branch-1' }),
}));

vi.mock('../../components/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../lib/notificationService', () => ({
  subscribeToNotifications: vi.fn(() => () => {}),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  getUnreadCount: vi.fn(() => 0),
  NOTIF_ICONS: {},
}));

vi.mock('../../lib/notificationSound', () => ({
  playChime: vi.fn(),
}));

describe('NotificacionesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const NotificacionesView = (await import('../NotificacionesView')).default;
    const { container } = renderWithProviders(<NotificacionesView />);
    expect(container).toBeTruthy();
  });

  it('shows the notifications page heading', async () => {
    const NotificacionesView = (await import('../NotificacionesView')).default;
    renderWithProviders(<NotificacionesView />);
    expect(screen.getByText(/notificaciones/i)).toBeTruthy();
  });
});
