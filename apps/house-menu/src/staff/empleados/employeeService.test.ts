import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── In-memory store ──────────────────────────────────────
function createStore() {
  const data: Record<string, unknown> = {};
  return {
    get(path: string) {
      const parts = path.split('/').filter(Boolean);
      let cur: unknown = data;
      for (const part of parts) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = (cur as Record<string, unknown>)[part];
      }
      return cur;
    },
    set(path: string, value: unknown) {
      const parts = path.split('/').filter(Boolean);
      let cur: Record<string, unknown> = data;
      for (let i = 0; i < parts.length - 1; i += 1) {
        if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
        cur = cur[parts[i]] as Record<string, unknown>;
      }
      cur[parts[parts.length - 1]] = value;
    },
  };
}

let store: ReturnType<typeof createStore>;

vi.mock('@house/db', () => ({ realtimeDB: {} }));

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db: unknown, path: string) => ({ path })),
  get: vi.fn(async (ref: { path: string }) => {
    const value = store.get(ref.path);
    return { exists: () => value !== undefined && value !== null, val: () => value };
  }),
  set: vi.fn(async (ref: { path: string }, value: unknown) => store.set(ref.path, value)),
  update: vi.fn(async (ref: { path: string }, value: Record<string, unknown>) => {
    const existing = store.get(ref.path) as Record<string, unknown> | undefined;
    store.set(ref.path, { ...(existing || {}), ...value });
  }),
  push: vi.fn((parentRef: { path: string }) => ({ path: `${parentRef.path}/generated`, key: 'generated' })),
  onValue: vi.fn((ref: { path: string }, callback: (snap: { val: () => unknown; exists: () => boolean }) => void) => {
    const value = store.get(ref.path);
    const exists = value !== undefined && value !== null;
    callback({ val: () => value, exists: () => exists });
    return () => {};
  }),
  runTransaction: vi.fn(async (ref: { path: string }, updateFn: (current: unknown) => unknown) => {
    const currentValue = store.get(ref.path);
    const nextValue = updateFn(currentValue === undefined ? null : currentValue);
    store.set(ref.path, nextValue);
    return { snapshot: { val: () => nextValue } };
  }),
  serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
}));

const BRANCH = 'b1';

describe('empleados employeeService', () => {
  beforeEach(() => {
    store = createStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── getEmployee ──────────────────────────────────────

  it('getEmployee returns null for non-existent uid', async () => {
    const { getEmployee } = await import('./employeeService');
    const result = await getEmployee(BRANCH, 'nonexistent-uid');
    expect(result).toBeNull();
  });

  it('getEmployee returns employee data for existing uid', async () => {
    const employeeData = { name: 'Test User', role: 'admin', active: true };
    store.set(`branches/${BRANCH}/employees/test-uid`, employeeData);

    const { getEmployee } = await import('./employeeService');
    const result = await getEmployee(BRANCH, 'test-uid');

    expect(result).toBeDefined();
    expect(result).toMatchObject({ uid: 'test-uid', ...employeeData });
    expect((result as Record<string, unknown>).name).toBe('Test User');
  });

  // ── subscribeEmployee ────────────────────────────────

  it('subscribeEmployee returns unsubscribe function', async () => {
    const { subscribeEmployee } = await import('./employeeService');
    const unsub = subscribeEmployee(BRANCH, 'test-uid', () => {});
    expect(typeof unsub).toBe('function');
  });

  // ── clockIn ──────────────────────────────────────────

  it('clockIn creates a new attendance record with clockIn timestamp', async () => {
    vi.setSystemTime(new Date('2026-06-15T14:30:00.000Z'));
    const { clockIn } = await import('./employeeService');

    await clockIn(BRANCH, 'uid-123');

    const record = store.get(`branches/${BRANCH}/employees/uid-123/attendance/2026-06-15`);
    expect(record).toBeDefined();
    expect((record as Record<string, unknown>).date).toBe('2026-06-15');
    expect(typeof (record as Record<string, unknown>).clockIn).toBe('number');
    expect((record as Record<string, unknown>).clockOut).toBeNull();
  });

  it('clockIn does not overwrite existing attendance record', async () => {
    vi.setSystemTime(new Date('2026-06-15T14:30:00.000Z'));
    const existing = { clockIn: 1000, clockOut: null, date: '2026-06-15' };
    store.set(`branches/${BRANCH}/employees/uid-123/attendance/2026-06-15`, existing);

    const { clockIn } = await import('./employeeService');
    const result = await clockIn(BRANCH, 'uid-123');

    const record = store.get(`branches/${BRANCH}/employees/uid-123/attendance/2026-06-15`) as Record<string, unknown>;
    expect(record.clockIn).toBe(1000); // unchanged
  });

  // ── clockOut ─────────────────────────────────────────

  it('clockOut sets clockOut on existing attendance record', async () => {
    vi.setSystemTime(new Date('2026-06-15T14:30:00.000Z'));
    store.set(`branches/${BRANCH}/employees/uid-123/attendance/2026-06-15`, {
      clockIn: 1000, clockOut: null, date: '2026-06-15',
    });

    vi.setSystemTime(new Date('2026-06-15T22:30:00.000Z'));
    const { clockOut } = await import('./employeeService');
    await clockOut(BRANCH, 'uid-123');

    const record = store.get(`branches/${BRANCH}/employees/uid-123/attendance/2026-06-15`) as Record<string, unknown>;
    expect(record.clockOut).toBe(Date.now());
  });

  // ── subscribeAttendance ──────────────────────────────

  it('subscribeAttendance returns unsubscribe function', async () => {
    const { subscribeAttendance } = await import('./employeeService');
    const unsub = subscribeAttendance(BRANCH, 'uid-123', () => {});
    expect(typeof unsub).toBe('function');
  });

  // ── getSchedule ──────────────────────────────────────

  it('getSchedule returns null for uid with no schedule', async () => {
    const { getSchedule } = await import('./employeeService');
    const result = await getSchedule(BRANCH, 'no-schedule-uid');
    expect(result).toBeNull();
  });

  it('getSchedule returns schedule data for uid', async () => {
    const scheduleData = {
      lunes: { start: '09:00', end: '18:00', active: true },
      martes: { start: '09:00', end: '18:00', active: true },
    };
    store.set(`branches/${BRANCH}/employees/scheduled-uid/schedule`, scheduleData);

    const { getSchedule } = await import('./employeeService');
    const result = await getSchedule(BRANCH, 'scheduled-uid');

    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).lunes).toMatchObject({ start: '09:00', end: '18:00', active: true });
  });

  // ── subscribeGoals ───────────────────────────────────

  it('subscribeGoals returns unsubscribe function', async () => {
    const { subscribeGoals } = await import('./employeeService');
    const unsub = subscribeGoals(BRANCH, 'uid-123', () => {});
    expect(typeof unsub).toBe('function');
  });

  it('subscribeGoals calls callback with empty array when no goals exist', async () => {
    const { subscribeGoals } = await import('./employeeService');
    const callback = vi.fn();
    subscribeGoals(BRANCH, 'no-goals-uid', callback);

    const callbacks = (vi.mocked(await import('firebase/database')).onValue as ReturnType<typeof vi.fn>).mock.calls;
    // The onValue mock calls the callback immediately
    expect(callback).toHaveBeenCalledWith([]);
  });

  // ── subscribeAttendanceHistory ───────────────────────

  it('subscribeAttendanceHistory returns unsubscribe function', async () => {
    const { subscribeAttendanceHistory } = await import('./employeeService');
    const unsub = subscribeAttendanceHistory(BRANCH, 'uid-123', () => {});
    expect(typeof unsub).toBe('function');
  });

  // ── Data path verification (unified model) ───────────

  it('uses branches/{branch}/employees/{uid} paths (not tenants)', async () => {
    const { getEmployee } = await import('./employeeService');
    store.set(`branches/${BRANCH}/employees/uid-456`, { name: 'Branch User' });

    const result = await getEmployee(BRANCH, 'uid-456');
    expect(result).toMatchObject({ uid: 'uid-456', name: 'Branch User' });

    // Verify tenants path is NOT used
    const tenantsData = store.get('tenants');
    expect(tenantsData).toBeUndefined();
  });
});
