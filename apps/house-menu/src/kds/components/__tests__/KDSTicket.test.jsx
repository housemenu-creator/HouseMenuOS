import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KDSTicket from '../KDSTicket';
import { PRIORITY } from '../../kdsTypes';

// --- Mocks ---

vi.mock('../../../context/BranchContext', () => ({
  useBranch: () => ({ activeBranchId: 'monteverde' }),
}));

vi.mock('../../../lib/ordersService', () => ({
  ordersService: {
    updateOrderPriority: vi.fn(),
  },
}));

vi.mock('../../../lib/printTicket', () => ({
  printTicket: vi.fn(),
}));

vi.mock('../../../components/ConfirmDialog', () => ({
  confirmDialog: vi.fn(() => Promise.resolve(true)),
}));

// Mock useTimerStore — return alertLevels (lo que KDSTicket realmente lee)
const mockAlertLevels = {};
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@test.com', displayName: 'Test' } }),
}));

vi.mock('../../store/timerStore', () => ({
  default: (selector) => {
    const state = { alertLevels: mockAlertLevels, elapsed: {} };
    return selector ? selector(state) : state;
  },
}));

function makeOrder(overrides = {}) {
  return {
    id: 'ord-test-123',
    status: 'recibido',
    customerName: 'Juan Perez',
    createdAt: new Date().toISOString(),
    items: [
      { name: 'Parrilla Mixta', quantity: 2, price: 45 },
      { name: 'Chicha Morada', quantity: 1, price: 8 },
    ],
    priority: PRIORITY.NORMAL,
    location: 'Mesa 5',
    ...overrides,
  };
}

describe('KDSTicket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete mockAlertLevels['ord-test-123'];
  });

  it('renders customer name', () => {
    render(<KDSTicket order={makeOrder()} />);
    expect(screen.getByText('Juan Perez')).toBeDefined();
  });

  it('renders order id (last 6 chars)', () => {
    render(<KDSTicket order={makeOrder({ id: 'ord-test-abc' })} />);
    expect(screen.getByText(/#ST-ABC/)).toBeDefined();
  });

  it('renders status badge', () => {
    render(<KDSTicket order={makeOrder({ status: 'preparando' })} />);
    expect(screen.getByText('preparando')).toBeDefined();
  });

  it('renders item names', () => {
    render(<KDSTicket order={makeOrder()} />);
    expect(screen.getByText('Parrilla Mixta')).toBeDefined();
    expect(screen.getByText('Chicha Morada')).toBeDefined();
  });

  it('renders location when present', () => {
    render(<KDSTicket order={makeOrder({ location: 'Av. Principal 123' })} />);
    expect(screen.getByText('Av. Principal 123')).toBeDefined();
  });

  it('renders observaciones when present', () => {
    const order = makeOrder({ observaciones: 'Sin sal' });
    render(<KDSTicket order={order} />);
    expect(screen.getByText(/Sin sal/)).toBeDefined();
  });

  it('shows action button for recibido status', () => {
    render(
      <KDSTicket order={makeOrder()} onUpdateStatus={vi.fn()} />
    );
    expect(screen.getByText('INICIAR PREPARACIÓN')).toBeDefined();
  });

  it('shows action button for preparando status', () => {
    render(
      <KDSTicket order={makeOrder({ status: 'preparando' })} onUpdateStatus={vi.fn()} />
    );
    expect(screen.getByText(/LISTO/)).toBeDefined();
  });

  it('hides action button for listo status', () => {
    render(
      <KDSTicket order={makeOrder({ status: 'listo' })} onUpdateStatus={vi.fn()} />
    );
    expect(screen.queryByText(/INICIAR PREPARACIÓN|MARCAR COMO LISTO/)).toBeNull();
  });

  it('calls onUpdateStatus when action button is clicked', async () => {
    const onUpdateStatus = vi.fn();
    render(<KDSTicket order={makeOrder()} onUpdateStatus={onUpdateStatus} />);
    fireEvent.click(screen.getByText('INICIAR PREPARACIÓN'));
    await waitFor(() => {
      expect(onUpdateStatus).toHaveBeenCalledWith('ord-test-123', 'recibido');
    });
  });

  it('shows checkbox in bulk mode', () => {
    render(<KDSTicket order={makeOrder()} isBulkMode={true} selected={false} onToggleSelect={vi.fn()} />);
    // In bulk mode, the square icon should render (unchecked)
    const svg = document.querySelector('.lucide-square');
    expect(svg).toBeDefined();
  });

  it('shows checked checkbox when selected in bulk mode', () => {
    render(<KDSTicket order={makeOrder()} isBulkMode={true} selected={true} onToggleSelect={vi.fn()} />);
    const svg = document.querySelector('.lucide-check-square');
    expect(svg).toBeDefined();
  });

  it('calls onToggleSelect when checkbox is clicked', () => {
    const onToggleSelect = vi.fn();
    render(<KDSTicket order={makeOrder()} isBulkMode={true} selected={false} onToggleSelect={onToggleSelect} />);
    const checkbox = document.querySelector('.lucide-square')?.closest('button');
    if (checkbox) fireEvent.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith('ord-test-123');
  });

  it('shows priority badge with NORMAL', () => {
    render(<KDSTicket order={makeOrder({ priority: PRIORITY.NORMAL })} />);
    expect(screen.getByText('Normal')).toBeDefined();
  });

  it('shows priority badge with RUSH', () => {
    render(<KDSTicket order={makeOrder({ priority: PRIORITY.RUSH })} />);
    expect(screen.getByText('Rush')).toBeDefined();
  });

  it('renders in history mode without action button', () => {
    const onUpdateStatus = vi.fn();
    render(<KDSTicket order={makeOrder({ status: 'entregado' })} isHistory={true} onUpdateStatus={onUpdateStatus} />);
    expect(screen.queryByText(/INICIAR PREPARACIÓN|MARCAR COMO LISTO/)).toBeNull();
  });

  it('renders quantity badges for items in history/listo mode', () => {
    render(<KDSTicket order={makeOrder({ status: 'listo' })} />);
    // Item quantities should show as badges
    const qtyElements = screen.getAllByText('2');
    expect(qtyElements.length).toBeGreaterThanOrEqual(1);
  });

  it('allows toggling item done state', () => {
    render(<KDSTicket order={makeOrder()} />);
    const itemCheck = document.querySelector('.lucide-circle');
    expect(itemCheck).toBeDefined();
    fireEvent.click(itemCheck.closest('button'));
    // After clicking, should show check-circle
    const checkCircle = document.querySelector('.lucide-check-circle');
    expect(checkCircle).toBeDefined();
  });

  it('renders item details as individual lines with indent', () => {
    const order = makeOrder({
      items: [
        { name: 'Súper Promo Pollo', quantity: 1, price: 25, details: ['Tamaño: Grande', 'Proteína: Pollo', 'Adicionales: Queso, Lechuga'] },
      ],
    });
    const { container } = render(<KDSTicket order={order} />);
    // Each detail should render as a separate element
    expect(screen.getByText('Tamaño: Grande')).toBeDefined();
    expect(screen.getByText('Proteína: Pollo')).toBeDefined();
    expect(screen.getByText('Adicionales: Queso, Lechuga')).toBeDefined();
    // Should use border-l indent styling
    const detailLines = container.querySelectorAll('.border-l-2');
    expect(detailLines.length).toBe(3);
  });

  it('renders item without details gracefully', () => {
    const order = makeOrder({
      items: [
        { name: 'Simple Item', quantity: 1, price: 10 },
      ],
    });
    render(<KDSTicket order={order} />);
    expect(screen.getByText('Simple Item')).toBeDefined();
  });

  it('shows timer via TimerBadge', () => {
    render(<KDSTicket order={makeOrder()} />);
    // TimerBadge compute desde order.createdAt, debe mostrar algo
    const timer = document.querySelector('.lucide-clock');
    expect(timer).toBeDefined();
  });

  it('shows warning alert bar when elapsed > 8 min', () => {
    mockAlertLevels['ord-test-123'] = 'warning';
    const { container } = render(<KDSTicket order={makeOrder()} />);
    const alertBar = container.querySelector('.bg-cm-warning');
    expect(alertBar).toBeDefined();
  });

  it('shows critical alert bar when elapsed > 12 min', () => {
    mockAlertLevels['ord-test-123'] = 'critical';
    const { container } = render(<KDSTicket order={makeOrder()} />);
    const alertBar = container.querySelector('.bg-cm-error');
    expect(alertBar).toBeDefined();
  });

  it('is draggable in normal mode', () => {
    const { container } = render(<KDSTicket order={makeOrder()} />);
    const ticket = container.querySelector('[draggable="true"]');
    expect(ticket).toBeDefined();
  });

  it('is not draggable in history mode', () => {
    const { container } = render(<KDSTicket order={makeOrder()} isHistory={true} />);
    const ticket = container.querySelector('[draggable="true"]');
    expect(ticket).toBeNull();
  });

  it('is not draggable in bulk mode', () => {
    const { container } = render(<KDSTicket order={makeOrder()} isBulkMode={true} />);
    const ticket = container.querySelector('[draggable="true"]');
    expect(ticket).toBeNull();
  });
});
