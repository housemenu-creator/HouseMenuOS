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

vi.mock('./authService', () => ({
  createUser: vi.fn(async () => ({ success: true, userId: 'user-gen' })),
  updateUser: vi.fn(async () => ({ success: true })),
  deleteUser: vi.fn(async () => ({ success: true })),
}));

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db, path) => ({ path })),
  get: vi.fn(async (ref) => {
    const value = store.get(ref.path);
    return { exists: () => value !== undefined && value !== null, val: () => value };
  }),
  set: vi.fn(async (ref, value) => store.set(ref.path, value)),
  push: vi.fn((parentRef) => ({ path: `${parentRef.path}/generated`, key: 'generated' })),
  update: vi.fn(async (ref, value) => store.set(ref.path, { ...(store.get(ref.path) || {}), ...value })),
  remove: vi.fn(async (ref) => store.set(ref.path, undefined)),
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
  query: vi.fn((ref, ...constraints) => ({ ...ref, constraints })),
  limitToLast: vi.fn((n) => ({ type: 'limitToLast', n })),
  orderByKey: vi.fn(() => ({ type: 'orderByKey' })),
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

  it('subscribes to one employee today attendance from tenant path', async () => {
    vi.setSystemTime(new Date('2026-06-14T01:30:00.000Z'));
    const { subscribeEmployeeTodayAttendance } = await import('./employeeService.js');
    store.set('tenants/default/employees/user-1/attendance/2026-06-13', {
      state: 'active', clockIn: 1234567890, date: '2026-06-13',
    });
    const rec = await new Promise((resolve) => {
      subscribeEmployeeTodayAttendance('user-1', resolve);
    });
    expect(rec.date).toBe('2026-06-13');
    expect(rec.state).toBe('active');
    // null when nothing recorded
    const none = await new Promise((resolve) => {
      subscribeEmployeeTodayAttendance('user-9', resolve);
    });
    expect(none).toBeNull();
  });

  it('subscribes to attendance history sorted by clockIn desc', async () => {
    vi.setSystemTime(new Date('2026-06-14T01:30:00.000Z'));
    const { subscribeEmployeeAttendanceHistory } = await import('./employeeService.js');
    store.set('tenants/default/employees/user-1/attendance/2026-06-13', {
      state: 'completed', clockIn: 1000, clockOut: 2000, date: '2026-06-13',
    });
    store.set('tenants/default/employees/user-1/attendance/2026-06-12', {
      state: 'completed', clockIn: 3000, clockOut: 4000, date: '2026-06-12',
    });
    const records = await new Promise((resolve) => {
      subscribeEmployeeAttendanceHistory('user-1', resolve);
    });
    expect(records.map(r => r.date)).toEqual(['2026-06-12', '2026-06-13']);
  });

  it('queries attendance history with orderByKey().limitToLast(daysBack)', async () => {
    const { getAttendanceHistory } = await import('./employeeService.js');
    const { query, limitToLast, orderByKey } = await import('firebase/database');
    store.set('tenants/default/employees/user-1/attendance/2026-06-10', {
      state: 'completed', clockIn: 100, date: '2026-06-10',
    });
    store.set('tenants/default/employees/user-1/attendance/2026-06-11', {
      state: 'completed', clockIn: 200, date: '2026-06-11',
    });

    const records = await getAttendanceHistory('monteverde', 'emp-1', 'user-1', 7);

    expect(limitToLast).toHaveBeenCalledWith(7);
    expect(orderByKey).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(expect.anything(), { type: 'orderByKey' }, { type: 'limitToLast', n: 7 });
    expect(records.map(r => r.date)).toEqual(['2026-06-11', '2026-06-10']);
  });

  it('returns [] when getAttendanceHistory has no userId', async () => {
    const { getAttendanceHistory } = await import('./employeeService.js');
    const records = await getAttendanceHistory('monteverde', 'emp-1', null);
    expect(records).toEqual([]);
  });

  // ── Goals (unified via userId bridge) ─────────────────

  it('setGoal writes to tenant path via branch employee userId', async () => {
    store.set('branches/monteverde/employees/emp-1', { userId: 'user-1' });
    const { setGoal } = await import('./employeeService.js');
    await setGoal('monteverde', 'emp-1', { metric: 'sales', target: 100, period: 'monthly' });

    const branchGoals = store.get('branches/monteverde/employees/emp-1/goals');
    expect(branchGoals).toBeUndefined();
    const tenantGoals = store.get('tenants/default/employees/user-1/goals');
    expect(tenantGoals.generated).toMatchObject({ metric: 'sales', target: 100, period: 'monthly' });
  });

  it('getGoals resolves branch employee userId and reads tenant goals', async () => {
    store.set('branches/monteverde/employees/emp-1', { userId: 'user-1' });
    store.set('tenants/default/employees/user-1/goals/g-1', { metric: 'orders', target: 50, period: 'weekly' });
    const { getGoals } = await import('./employeeService.js');
    const goals = await getGoals('monteverde', 'emp-1');
    expect(goals).toHaveLength(1);
    expect(goals[0]).toMatchObject({ id: 'g-1', metric: 'orders', target: 50 });
  });

  it('setGoal falls back to branch path when employee has no userId', async () => {
    store.set('branches/monteverde/employees/no-link', { userId: null });
    const { setGoal } = await import('./employeeService.js');
    await setGoal('monteverde', 'no-link', { metric: 'sales', target: 10, period: 'daily' });

    const branchGoals = store.get('branches/monteverde/employees/no-link/goals');
    expect(branchGoals.generated).toMatchObject({ metric: 'sales', target: 10 });
  });

  // ── Admin listado + CRUD (tenant-first) ───────────────

  it('subscribeEmployees mergea tenant (aprobados) + branch legacy sin cuenta', async () => {
    const { subscribeEmployees } = await import('./employeeService.js');
    // aprobado vía aplicación: SOLO tenant record
    store.set('tenants/default/employees/user-1', {
      profile: { name: 'Ana Aprobada', email: 'ana@test.com', active: true },
      role: 'cajero',
    });
    // legacy branch sin cuenta
    store.set('branches/monteverde/employees/push-9', {
      name: 'Leo Legacy', email: 'leo@test.com', role: 'mozo', userId: null,
    });
    // branch con userId → NO duplica (id = userId)
    store.set('branches/monteverde/employees/push-1', { userId: 'user-x', name: 'viejito' });

    const list = await new Promise((resolve) => {
      subscribeEmployees('monteverde', resolve);
    });
    const ids = list.map(e => e.id).sort();
    expect(ids).toEqual(['push-9', 'user-1', 'user-x']);
    const ana = list.find(e => e.id === 'user-1');
    expect(ana).toMatchObject({ name: 'Ana Aprobada', userId: 'user-1', role: 'cajero' });
    const leo = list.find(e => e.id === 'push-9');
    expect(leo).toMatchObject({ name: 'Leo Legacy', userId: null });
    // branch con userId pero sin tenant record (huérfano): visible con id = userId
    const orphan = list.find(e => e.id === 'user-x');
    expect(orphan).toMatchObject({ name: 'viejito', userId: 'user-x' });
  });

  it('createEmployee con rol login crea cuenta y escribe flat en el tenant record', async () => {
    const { createEmployee } = await import('./employeeService.js');
    const { createUser } = await import('./authService');

    const result = await createEmployee('monteverde', {
      name: 'Juan Nuevo', email: 'juan@test.com', role: 'cajero', pin: '1234',
      phone: '999111222', hourlyRate: 12,
    });

    expect(createUser).toHaveBeenCalled();
    expect(result.userId).toBe('user-gen');
    expect(result.id).toBe('user-gen');
    const rec = store.get('tenants/default/employees/user-gen');
    expect(rec.phone).toBe('999111222');
    expect(rec.hourlyRate).toBe(12);
    // sin branch record duplicado
    expect(store.get('branches/monteverde/employees')).toBeUndefined();
  });

  it('createEmployee sin rol login crea tenant record flat sin cuenta', async () => {
    const { createEmployee } = await import('./employeeService.js');
    const result = await createEmployee('monteverde', {
      name: 'Sin Login', role: 'mozo', email: '',
    });
    expect(result.userId).toBeNull();
    const rec = store.get('tenants/default/employees/generated');
    expect(rec).toBeDefined();
    expect(rec.role).toBe('mozo');
    expect(rec.homeBranch).toBe('monteverde');
  });

  it('updateEmployee tenant-first: sync cuenta (updateUser) + flat al tenant record', async () => {
    const { updateEmployee } = await import('./employeeService.js');
    const { updateUser } = await import('./authService');
    store.set('tenants/default/employees/user-1', {
      profile: { name: 'Ana', email: 'ana@test.com', active: true },
      role: 'cajero',
    });

    await updateEmployee('monteverde', 'user-1', { name: 'Ana Edit', phone: '111222333', status: 'vacation' });

    expect(updateUser).toHaveBeenCalledWith('user-1', expect.objectContaining({ name: 'Ana Edit', status: 'vacation' }));
    const rec = store.get('tenants/default/employees/user-1');
    expect(rec.phone).toBe('111222333');
  });

  it('deleteEmployee tenant-first: deleteUser + limpia branch legacy linkeado', async () => {
    const { deleteEmployee } = await import('./employeeService.js');
    const { deleteUser } = await import('./authService');
    store.set('tenants/default/employees/user-1', { role: 'cajero', profile: {} });
    store.set('branches/monteverde/employees/push-1', { userId: 'user-1', name: 'viejo' });

    const result = await deleteEmployee('monteverde', 'user-1', 'admin');
    expect(result.success).toBe(true);
    expect(deleteUser).toHaveBeenCalledWith('user-1', 'system', 'admin');
    expect(store.get('branches/monteverde/employees/push-1')).toBeUndefined();
  });

  it('getSchedule lee del tenant record cuando el id es tenant employee', async () => {
    const { getSchedule } = await import('./employeeService.js');
    store.set('tenants/default/employees/user-1/schedule', {
      lunes: { start: '09:00', end: '17:00', active: true },
    });
    const week = await getSchedule('monteverde', 'user-1');
    expect(week.find(d => d.day === 'lunes')).toEqual({ day: 'lunes', start: '09:00', end: '17:00', active: true, station: '' });
  });

  it('saveSchedule tenant-first: escribe en tenant sin branch skeleton', async () => {
    const { saveSchedule } = await import('./employeeService.js');
    store.set('tenants/default/employees/user-1', { role: 'cajero' });
    await saveSchedule('monteverde', 'user-1', [
      { day: 'lunes', start: '08:00', end: '16:00', active: true },
    ], 'user-1');
    const tenantSch = store.get('tenants/default/employees/user-1/schedule/lunes');
    expect(tenantSch).toEqual({ start: '08:00', end: '16:00', active: true, station: '' });
    expect(store.get('branches/monteverde/employees')).toBeUndefined();
  });

  it('setGoal con id de tenant employee escribe goals en tenant directo', async () => {
    const { setGoal } = await import('./employeeService.js');
    store.set('tenants/default/employees/user-1', { role: 'cajero' });
    await setGoal('monteverde', 'user-1', { metric: 'sales', target: 100, period: 'monthly' });
    const tenantGoals = store.get('tenants/default/employees/user-1/goals');
    expect(tenantGoals.generated).toMatchObject({ metric: 'sales', target: 100 });
  });

  it('clockIn con empleado aprobado (sin branch record) valida status del tenant', async () => {
    vi.setSystemTime(new Date('2026-06-14T01:30:00.000Z'));
    const { clockIn } = await import('./employeeService.js');
    store.set('tenants/default/employees/user-1', {
      profile: { name: 'Ana', active: true },
      role: 'cajero',
      status: 'suspended',
      schedule: { sábado: { start: '08:00', end: '16:00', active: true } },
    });
    await expect(clockIn('monteverde', 'user-1', 'user-1')).rejects.toThrow('suspendido');
  });
});
