import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TasksView from '../TasksView';

// ── Hoisted mock ──
const { mockSubscribeGoals } = vi.hoisted(() => ({
  mockSubscribeGoals: vi.fn(),
}));

// ── Framermotion mock ──
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// ── Service mock ──
vi.mock('../employeeService', () => ({
  subscribeGoals: mockSubscribeGoals,
}));

const UID = 'emp-001';

const mockGoals = [
  { id: 'g1', title: 'Limpiar parrilla', description: 'Antes del cierre', dueDate: '2026-06-25', completed: false },
  { id: 'g2', title: 'Reponer servilletas', completed: false },
  { id: 'g3', title: 'Cerrar caja', description: 'Verificar con admin', completed: true },
];

describe('TasksView', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows loading skeleton on mount', async () => {
    mockSubscribeGoals.mockImplementation((_branchId: string, _uid: string, cb: (data: any[]) => void) => {
      // Async callback to allow loading state to render
      Promise.resolve().then(() => cb([]));
      return () => {};
    });
    render(<TasksView uid={UID} branchId="b1" />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders populated tasks with pending and completed sections', async () => {
    mockSubscribeGoals.mockImplementation((_branchId: string, _uid: string, cb: (data: any[]) => void) => {
      cb(mockGoals);
      return () => {};
    });
    render(<TasksView uid={UID} branchId="b1" />);

    await waitFor(() => {
      expect(screen.getByText('Pendientes (2)')).toBeDefined();
    });

    // Pending goals
    expect(screen.getByText('Limpiar parrilla')).toBeDefined();
    expect(screen.getByText('Reponer servilletas')).toBeDefined();
    expect(screen.getByText('Antes del cierre')).toBeDefined();

    // Completed section
    expect(screen.getByText('Completadas (1)')).toBeDefined();
    expect(screen.getByText('Cerrar caja')).toBeDefined();
  });

  it('shows "Todo al día" when no pending goals', async () => {
    const allCompleted = [
      { id: 'g1', title: 'Done task', completed: true },
    ];
    mockSubscribeGoals.mockImplementation((_branchId: string, _uid: string, cb: (data: any[]) => void) => {
      cb(allCompleted);
      return () => {};
    });
    render(<TasksView uid={UID} branchId="b1" />);

    await waitFor(() => {
      expect(screen.getByText(/Todo al día/)).toBeDefined();
    });
  });

  it('shows empty state when no goals returned', async () => {
    mockSubscribeGoals.mockImplementation((_branchId: string, _uid: string, cb: (data: any[]) => void) => {
      cb([]);
      return () => {};
    });
    render(<TasksView uid={UID} branchId="b1" />);

    await waitFor(() => {
      expect(screen.getByText('Sin tareas asignadas')).toBeDefined();
    });
  });

  it('shows error state when uid is empty', () => {
    render(<TasksView uid="" branchId="b1" />);
    expect(screen.getByText('Error al cargar')).toBeDefined();
  });
});
