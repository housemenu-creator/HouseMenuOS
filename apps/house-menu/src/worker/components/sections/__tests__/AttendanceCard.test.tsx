import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/test-utils';

// The component import MUST stay at module level (NOT inside vi.hoisted).
// eslint-disable-next-line import/order — keep below mocks but after hoisted setup.
// @ts-ignore
// @vitest-environment jsdom
import AttendanceCard from '../AttendanceCard';

// ── All hoisted mocks ──────────────────────────────────────
// (must be in vi.hoisted because vi.mock factories are hoisted)
const { mockOnValue, mockClockIn, mockClockOut, mockGetHistory, __setAttendance } = vi.hoisted(() => {
  let _attData: any = null;
  return {
    mockOnValue: vi.fn((_ref: any, cb: (snap: { val: () => any }) => void) => {
      cb({ val: () => _attData });
      return () => {};
    }),
    mockClockIn: vi.fn(),
    mockClockOut: vi.fn(),
    mockGetHistory: vi.fn(),
    __setAttendance: (d: any) => { _attData = d; },
  };
});

// ── Context mocks ──
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'Test User', role: 'mozo' } }),
}));

vi.mock('../../../../context/BranchContext', () => ({
  useBranch: () => ({ activeBranchId: 'branch-1' }),
}));

// ── Firebase mocks ──
vi.mock('@house/db', () => ({ realtimeDB: {}, app: {} }));

vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  onValue: mockOnValue,
}));

vi.mock('../../../../lib/tenantService', () => ({
  tenantRef: vi.fn((path: string) => `tenant/${path}`),
}));

// ── Employee service mocks ──
vi.mock('../../../../lib/employeeService', () => ({
  clockIn: mockClockIn,
  clockOut: mockClockOut,
  getAttendanceHistory: mockGetHistory,
}));

// ── Tests ──

describe('AttendanceCard', () => {
  const baseTime = new Date('2026-06-22T10:30:00');

  beforeEach(() => {
    vi.clearAllMocks();
    __setAttendance(null);
    mockGetHistory.mockResolvedValue([]);
  });

  // ── Render states ──

  it('renders fuera de turno when no attendance record', async () => {
    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    expect(await screen.findByText('Fuera de Turno')).toBeDefined();
    expect(screen.getByText('Iniciar Turno')).toBeDefined();
  });

  it('renders active shift when clockIn exists without clockOut', async () => {
    __setAttendance({ clockIn: Date.now() - 3_600_000 });

    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    expect(await screen.findByText('En Turno Activo')).toBeDefined();
    expect(screen.getByText('Terminar Turno')).toBeDefined();
  });

  it('renders completed shift when both clockIn and clockOut exist', async () => {
    __setAttendance({
      clockIn: Date.now() - 28_800_000,
      clockOut: Date.now() - 18_000_000,
    });

    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    expect(await screen.findByText('Turno Completado')).toBeDefined();
  });

  it('shows Iniciar Turno disabled when shift is completed', async () => {
    __setAttendance({
      clockIn: Date.now() - 28_800_000,
      clockOut: Date.now() - 18_000_000,
    });

    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    const btn = await screen.findByText('Iniciar Turno');
    expect(btn).toBeDisabled();
  });

  it('disables button while loading', async () => {
    mockClockIn.mockImplementation(() => new Promise(() => {})); // never settles

    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    const btn = await screen.findByText('Iniciar Turno');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(btn).toBeDisabled();
    });
  });

  // ── Interactions ──

  it('calls clockIn when Iniciar Turno is clicked', async () => {
    mockClockIn.mockResolvedValue({ clockIn: Date.now() });

    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    const btn = await screen.findByText('Iniciar Turno');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockClockIn).toHaveBeenCalledWith('branch-1', 'user-1');
    });
  });

  it('calls clockOut when Terminar Turno is clicked', async () => {
    __setAttendance({ clockIn: Date.now() - 3_600_000 });
    mockClockOut.mockResolvedValue({
      clockIn: Date.now() - 3_600_000,
      clockOut: Date.now(),
    });

    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    const btn = await screen.findByText('Terminar Turno');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockClockOut).toHaveBeenCalledWith('branch-1', 'user-1');
    });
  });

  // ── Error handling ──

  it('shows success toast after clockIn', async () => {
    mockClockIn.mockResolvedValue({ clockIn: Date.now() });

    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    fireEvent.click(screen.getByText('Iniciar Turno'));

    expect(await screen.findByText(/¡Turno iniciado con éxito/)).toBeDefined();
  });

  it('shows error toast when clockIn fails', async () => {
    mockClockIn.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    fireEvent.click(screen.getByText('Iniciar Turno'));

    expect(await screen.findByText('Error al iniciar el turno')).toBeDefined();
  });

  it('shows error toast when clockOut fails', async () => {
    __setAttendance({ clockIn: Date.now() - 3_600_000 });
    mockClockOut.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    fireEvent.click(screen.getByText('Terminar Turno'));

    expect(await screen.findByText('Error al finalizar el turno')).toBeDefined();
  });

  // ── History ──

  it('shows attendance history when records exist', async () => {
    __setAttendance({ clockIn: Date.now() - 3_600_000 });
    mockGetHistory.mockResolvedValue([
      {
        date: '2026-06-21',
        clockIn: new Date('2026-06-21T08:00:00').getTime(),
        clockOut: new Date('2026-06-21T17:00:00').getTime(),
      },
    ]);

    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    expect(await screen.findByText('Turnos Recientes')).toBeDefined();
  });

  it('shows empty state when no history', async () => {
    mockGetHistory.mockResolvedValue([]);

    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    expect(await screen.findByText('Sin registros previos')).toBeDefined();
  });

  it('calls getAttendanceHistory on mount', async () => {
    renderWithProviders(<AttendanceCard currentTime={baseTime} />);

    await waitFor(() => {
      expect(mockGetHistory).toHaveBeenCalledWith('branch-1', 'user-1');
    });
  });
});
