import { beforeEach, describe, expect, it, vi } from 'vitest';

function createStore() {
  const data = {};
  return {
    get(path) {
      const parts = path.split('/').filter(Boolean);
      let cur = data;
      for (const part of parts) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[part];
      }
      return cur;
    },
    set(path, value) {
      const parts = path.split('/').filter(Boolean);
      let cur = data;
      for (let i = 0; i < parts.length - 1; i += 1) {
        if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
    },
  };
}

let store;

vi.mock('@house/db', () => ({ realtimeDB: {} }));

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db, path) => ({ path })),
  get: vi.fn(async (ref) => {
    const value = store.get(ref.path);
    return { exists: () => value !== undefined && value !== null, val: () => value };
  }),
  set: vi.fn(async (ref, value) => store.set(ref.path, value)),
  push: vi.fn((parentRef) => ({ path: `${parentRef.path}/generated`, key: 'generated' })),
  update: vi.fn(async (ref, value) => store.set(ref.path, { ...(store.get(ref.path) || {}), ...value })),
  remove: vi.fn(async () => {}),
  onValue: vi.fn((ref, callback) => {
    callback({ val: () => store.get(ref.path) });
    return () => {};
  }),
  runTransaction: vi.fn(async (ref, updateFn) => {
    const currentValue = store.get(ref.path);
    const nextValue = updateFn(currentValue === undefined ? null : currentValue);
    store.set(ref.path, nextValue);
    return { snapshot: { val: () => nextValue } };
  }),
}));

describe('employeeService attendance dates', () => {
  beforeEach(() => {
    store = createStore();
    vi.useFakeTimers();
  });

  it('creates a clock-in record at the tenant path with Lima date', async () => {
    vi.setSystemTime(new Date('2026-06-14T01:30:00.000Z'));
    const { clockIn } = await import('./employeeService.js');

    // Seed schedule so validation passes (Lima time is Saturday 2026-06-13)
    store.set('branches/monteverde/employees/emp-1/schedule', {
      sábado: { start: '08:00', end: '17:00', active: true },
    });

    // clockIn now requires userId (tenant-level UID)
    await clockIn('monteverde', 'emp-1', 'user-1');

    const record = store.get('tenants/default/employees/user-1/attendance/2026-06-13');
    expect(record).toMatchObject({
      state: 'active',
      date: '2026-06-13',
    });
    expect(typeof record.clockIn).toBe('number');
    expect(store.get('tenants/default/employees/user-1/attendance/2026-06-14')).toBeUndefined();
  });
});
