import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';

vi.mock('../../context/BranchContext', () => ({
  useBranch: () => ({
    branches: [{ id: 'branch-1', name: 'Sucursal Central' }],
    activeBranchId: 'branch-1',
    setActiveBranchId: vi.fn(),
    activeBranch: { id: 'branch-1', name: 'Sucursal Central' },
    isLoading: false,
  }),
}));

vi.mock('firebase/database', () => ({
  ref: vi.fn(() => ({ key: 'mock-key' })),
  onValue: vi.fn(() => () => {}),
}));

vi.mock('@house/db', () => ({
  realtimeDB: {},
  app: {},
}));

describe('MonitorView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const MonitorView = (await import('../MonitorView')).default;
    const { container } = renderWithProviders(<MonitorView />);
    expect(container).toBeTruthy();
  });

  it('shows the monitor page heading', async () => {
    const MonitorView = (await import('../MonitorView')).default;
    renderWithProviders(<MonitorView />);
    expect(screen.getByText(/monitor/i)).toBeTruthy();
  });
});
