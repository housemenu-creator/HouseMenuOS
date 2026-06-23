import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ScheduleView from '../ScheduleView';

// ── Hoisted mock ──
const { mockGetSchedule } = vi.hoisted(() => ({
  mockGetSchedule: vi.fn(),
}));

// ── Service mock ──
vi.mock('../employeeService', () => ({
  getSchedule: mockGetSchedule,
}));

const UID = 'emp-001';

const mockSchedule = {
  lunes: { active: true, start: '09:00', end: '18:00' },
  martes: { active: true, start: '09:00', end: '18:00' },
  miércoles: { active: true, start: '09:00', end: '18:00' },
  jueves: { active: true, start: '09:00', end: '18:00' },
  viernes: { active: true, start: '09:00', end: '14:00' },
  sábado: { active: false },
  domingo: { active: false },
};

describe('ScheduleView', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows loading skeleton on mount', () => {
    mockGetSchedule.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ScheduleView uid={UID} />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders populated schedule with all days', async () => {
    mockGetSchedule.mockResolvedValue(mockSchedule);
    render(<ScheduleView uid={UID} />);

    await waitFor(() => {
      expect(screen.getByText('Lun')).toBeDefined();
    });

    // All day labels present
    expect(screen.getByText('Lun')).toBeDefined();
    expect(screen.getByText('Mar')).toBeDefined();
    expect(screen.getByText('Mié')).toBeDefined();
    expect(screen.getByText('Jue')).toBeDefined();
    expect(screen.getByText('Vie')).toBeDefined();
    expect(screen.getByText('Sáb')).toBeDefined();
    expect(screen.getByText('Dom')).toBeDefined();

    // Active days show times (rendered as "09:00 — 18:00" in one node, 5 active days)
    expect(screen.getAllByText(/09:00/).length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByText(/18:00/).length).toBeGreaterThanOrEqual(4);

    // Inactive days show "—"
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);

    // Badges
    expect(screen.getAllByText('Activo').length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByText('Descanso').length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state when schedule is null', async () => {
    mockGetSchedule.mockResolvedValue(null);
    render(<ScheduleView uid={UID} />);

    await waitFor(() => {
      expect(screen.getByText('Sin horario asignado')).toBeDefined();
    });
  });

  it('shows error state when uid is empty', () => {
    render(<ScheduleView uid="" />);
    expect(screen.getByText('Error al cargar')).toBeDefined();
  });

  it('shows error state when getSchedule rejects', async () => {
    mockGetSchedule.mockRejectedValue(new Error('fail'));
    render(<ScheduleView uid={UID} />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar')).toBeDefined();
    });
  });
});
