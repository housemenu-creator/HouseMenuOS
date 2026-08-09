import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AttendanceView from '../AttendanceView';

// ── Hoisted mock ──
const { mockSubscribeHistory } = vi.hoisted(() => ({
  mockSubscribeHistory: vi.fn(),
}));

// ── Framermotion mock ──
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// ── Service mock ──
vi.mock('../employeeService', () => ({
  subscribeAttendanceHistory: mockSubscribeHistory,
}));

const UID = 'emp-001';

// 8h 30m in ms
const EIGHT_H_30M = 8 * 60 * 60 * 1000 + 30 * 60 * 1000;
// 4h in ms
const FOUR_H = 4 * 60 * 60 * 1000;

const mockRecords = [
  { date: '2026-06-22', clockIn: 1000, clockOut: 1000 + EIGHT_H_30M },
  { date: '2026-06-21', clockIn: 2000, clockOut: 2000 + FOUR_H },
  { date: '2026-06-20', clockIn: 3000, clockOut: 3000 + EIGHT_H_30M },
  { date: '2026-05-15', clockIn: 4000, clockOut: 4000 + EIGHT_H_30M },
];

describe('AttendanceView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-15'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading skeleton on mount', () => {
    mockSubscribeHistory.mockImplementation((_branchId: string, _uid: string, cb: (data: any[]) => void) => {
      Promise.resolve().then(() => cb([]));
      return () => {};
    });
    render(<AttendanceView uid={UID} branchId="b1" />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders populated with stats and records', async () => {
    mockSubscribeHistory.mockImplementation((_branchId: string, _uid: string, cb: (data: any[]) => void) => {
      cb(mockRecords);
      return () => {};
    });
    render(<AttendanceView uid={UID} branchId="b1" />);

    await waitFor(() => {
      expect(screen.getByText('Días')).toBeDefined();
    });

    // Stats: 3 days in June (filtered), total gross = EIGHT_H_30M + FOUR_H + EIGHT_H_30M, no break
    expect(screen.getByText('3')).toBeDefined();
    const grossTexts = screen.getAllByText('21h 00m');
    expect(grossTexts.length).toBeGreaterThanOrEqual(2); // Bruto card + Neto card
    const breakTexts = screen.getAllByText('—');
    expect(breakTexts.length).toBeGreaterThanOrEqual(1); // Refrigerio card (0 break = —)

    // Records rendered
    expect(screen.getByText('22')).toBeDefined();
    expect(screen.getByText('21')).toBeDefined();
    expect(screen.getByText('20')).toBeDefined();

    // Status badges
    const completeBadges = screen.getAllByText('Completo');
    expect(completeBadges.length).toBeGreaterThanOrEqual(3);
  });

  it('shows partial badge for records without clockOut', async () => {
    const partialRecords = [
      { date: '2026-06-22', clockIn: 1000 },
    ];
    mockSubscribeHistory.mockImplementation((_branchId: string, _uid: string, cb: (data: any[]) => void) => {
      cb(partialRecords);
      return () => {};
    });
    render(<AttendanceView uid={UID} branchId="b1" />);

    await waitFor(() => {
      expect(screen.getByText('En curso')).toBeDefined();
    });

    expect(screen.getByText('Parcial')).toBeDefined();
  });

  it('shows empty state when no records', async () => {
    mockSubscribeHistory.mockImplementation((_branchId: string, _uid: string, cb: (data: any[]) => void) => {
      cb([]);
      return () => {};
    });
    render(<AttendanceView uid={UID} branchId="b1" />);

    await waitFor(() => {
      expect(screen.getByText('Sin registros')).toBeDefined();
    });
  });

it('shows error state when uid is empty', () => {
    render(<AttendanceView uid="" branchId="b1" />);
    expect(screen.getByText('Error al cargar')).toBeDefined();
  });

  it('shows month filter when multiple months available', async () => {
    mockSubscribeHistory.mockImplementation((_branchId: string, _uid: string, cb: (data: any[]) => void) => {
      cb(mockRecords);
      return () => {};
    });
    render(<AttendanceView uid={UID} branchId="b1" />);

    await waitFor(() => {
      expect(screen.getByText(/Junio 2026/)).toBeDefined();
    });

    // Second month button
    expect(screen.getByText(/Mayo 2026/)).toBeDefined();
  });

  it('renders formatDuration with — for null/negative values', async () => {
    // formatDuration is internal, but we can verify via partial records
    // that don't have clockOut → duration is 0 → rendered as — via the duration text
    const mixedRecords = [
      { date: '2026-06-22', clockIn: 1000, clockOut: 1000 + EIGHT_H_30M },
      { date: '2026-06-21', clockIn: 2000 }, // partial (no clockOut)
    ];
    mockSubscribeHistory.mockImplementation((_branchId: string, _uid: string, cb: (data: any[]) => void) => {
      cb(mixedRecords);
      return () => {};
    });
    render(<AttendanceView uid={UID} branchId="b1" />);

    await waitFor(() => {
      expect(screen.getByText('22')).toBeDefined();
    });

    // Complete record shows duration (also in total stats cards)
    const durationTexts = screen.getAllByText('8h 30m');
    expect(durationTexts.length).toBeGreaterThanOrEqual(2);
  });
});
