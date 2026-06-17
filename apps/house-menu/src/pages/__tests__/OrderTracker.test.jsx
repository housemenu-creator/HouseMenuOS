import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';

vi.mock('../../lib/ordersService', () => ({
  ordersService: {
    subscribeToOrder: vi.fn(() => () => {}),
  },
}));

vi.mock('@house/db', () => ({
  realtimeDB: {},
  app: {},
}));

vi.mock('../../components/HouseMenuNav', () => ({
  default: () => null,
}));

vi.mock('../../components/OrderTimeline', () => {
  const STATUS_STEPS = [
    { key: 'pendiente', title: 'Pendiente' },
    { key: 'preparando', title: 'Preparando' },
    { key: 'listo', title: 'Listo' },
    { key: 'en_camino', title: 'En Camino' },
    { key: 'entregado', title: 'Entregado' },
    { key: 'cancelado', title: 'Cancelado' },
  ];
  return {
    default: () => null,
    STATUS_STEPS,
  };
});

describe('OrderTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const OrderTracker = (await import('../OrderTracker')).default;
    const { container } = renderWithProviders(<OrderTracker />);
    expect(container).toBeTruthy();
  });

  it('shows the order tracking page heading', async () => {
    const OrderTracker = (await import('../OrderTracker')).default;
    renderWithProviders(<OrderTracker />);
    expect(screen.getByText(/rastrear/i)).toBeTruthy();
  });
});
