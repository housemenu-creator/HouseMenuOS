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

vi.mock('@house/db', () => ({ realtimeDB: {}, auth: {} }));

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db, path) => ({ path: path || '' })),
  get: vi.fn(async (ref) => {
    const value = store.get(ref.path);
    return { exists: () => value !== undefined && value !== null, val: () => value };
  }),
  set: vi.fn(async (ref, value) => store.set(ref.path, value)),
  push: vi.fn((parentRef) => ({ path: `${parentRef.path}/generated`, key: 'generated' })),
  update: vi.fn(async (ref, value) => {
    for (const [p, v] of Object.entries(value)) {
      store.set(`${ref.path}/${p}`.replace(/^\//, ''), v);
    }
  }),
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
  query: vi.fn((ref, ...constraints) => ({ ...ref, constraints })),
  limitToLast: vi.fn((n) => ({ type: 'limitToLast', n })),
  orderByKey: vi.fn(() => ({ type: 'orderByKey' })),
}));

// crypto real (hashPin/pinLookupKey) — no mockear
vi.unmock('./crypto');

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(async () => ({ user: { uid: 'new-uid-123' } })),
  deleteUser: vi.fn(async () => {}),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn(() => ({ fullPath: 'applications/uid/dni' })),
  uploadBytes: vi.fn(async () => ({})),
  getDownloadURL: vi.fn(async () => 'https://fake.download.url/file'),
  deleteObject: vi.fn(async () => {}),
}));

const authMock = {
  createUserWithEmailAndPassword: vi.fn(async () => ({ user: { uid: 'new-uid-123' } })),
  deleteUser: vi.fn(async () => {}),
};

describe('applicationsService', () => {
  beforeEach(() => {
    store = createStore();
    vi.clearAllMocks();
    authMock.deleteUser.mockClear();
  });

  it('submitApplication crea cuenta Auth, sube archivos y escribe la app pending', async () => {
    const { submitApplication } = await import('./applicationsService.js');

    const result = await submitApplication({
      email: 'trabajador@test.com',
      password: 'secret123',
      name: 'Juan Prueba',
      dni: '12345678',
      phone: '999888777',
      address: 'Av Test 123',
      birthDate: '1990-01-01',
      dniFile: { name: 'dni.pdf' },
      cvFile: { name: 'cv.pdf' },
    });

    expect(result.success).toBe(true);
    const app = store.get('tenants/default/applications/new-uid-123');
    expect(app).toBeDefined();
    expect(app.status).toBe('pending');
    expect(app.profile.name).toBe('Juan Prueba');
    expect(app.profile.email).toBe('trabajador@test.com');
    expect(app.files.dni).toBe('https://fake.download.url/file');
  });

  it('approveApplication crea empleado con PIN, índices globales y role cache', async () => {
    const { approveApplication } = await import('./applicationsService.js');
    store.set('tenants/default/applications/uid-abc', {
      status: 'pending',
      profile: { name: 'Maria Test', email: 'maria@test.com', dni: '87654321', phone: '111222333' },
      files: {},
      createdAt: '2026-08-13T00:00:00.000Z',
    });

    const result = await approveApplication({
      applicationId: 'uid-abc',
      name: 'Maria Test',
      email: 'maria@test.com',
      dni: '87654321',
      phone: '111222333',
      role: 'cajero',
      pin: '4321',
      branchIds: { monteverde: true },
      schedule: { lunes: { start: '08:00', end: '16:00', active: true } },
      functions: ['Caja 1'],
      actor: 'admin@test.com',
    });

    expect(result.success).toBe(true);
    const emp = store.get('tenants/default/employees/uid-abc');
    expect(emp).toBeDefined();
    expect(emp.role).toBe('cajero');
    expect(emp.firebaseUid).toBe('uid-abc');
    expect(emp.profile.pinHash).toBeTruthy();
    expect(emp.profile.pinLookupKey).toBeTruthy();
    expect(emp.schedule.lunes).toEqual({ start: '08:00', end: '16:00', active: true });

    // pin_lookup apunta al uid
    const lookup = emp.profile.pinLookupKey;
    expect(store.get(`tenants/default/pin_lookup/${lookup}`)).toBe('uid-abc');

    // índices globales
    expect(store.get('global/emails_to_uid/maria@test,com')).toBe('uid-abc');
    expect(store.get('global/users/uid-abc/memberships/default/role')).toBe('cajero');

    // role cache de la branch
    expect(store.get('branches/monteverde/_role_cache/uid-abc')).toBe('cajero');

    // la app queda aprobada
    expect(store.get('tenants/default/applications/uid-abc/status')).toBe('approved');
    expect(store.get('tenants/default/applications/uid-abc/assigned/pin')).toBe('4321');
  });

  it('approveApplication rechaza una app ya aprobada o PIN inválido', async () => {
    const { approveApplication } = await import('./applicationsService.js');
    store.set('tenants/default/applications/uid-xyz', { status: 'approved', profile: { email: 'x@y.com' } });

    const dup = await approveApplication({
      applicationId: 'uid-xyz', name: 'X', email: 'x@y.com', role: 'cajero', pin: '1111', actor: 'a',
    });
    expect(dup.success).toBe(false);

    store.set('tenants/default/applications/uid-abc', { status: 'pending', profile: { email: 'a@b.com' } });
    const badPin = await approveApplication({
      applicationId: 'uid-abc', name: 'A', email: 'a@b.com', role: 'cajero', pin: '12', actor: 'a',
    });
    expect(badPin.success).toBe(false);
  });

  it('rejectApplication marca rejected con motivo', async () => {
    const { rejectApplication } = await import('./applicationsService.js');
    store.set('tenants/default/applications/uid-dec', { status: 'pending', profile: { email: 'd@e.com' } });

    const result = await rejectApplication('uid-dec', 'DNI ilegible', 'admin@test.com');
    expect(result.success).toBe(true);
    expect(store.get('tenants/default/applications/uid-dec/status')).toBe('rejected');
    expect(store.get('tenants/default/applications/uid-dec/rejectReason')).toBe('DNI ilegible');
    expect(store.get('tenants/default/applications/uid-dec/rejectedAt')).toBeTruthy();
  });

  it('submitApplication escribe en el TENANT ACTIVO (multi-tenant, no hardcodeado default)', async () => {
    const { setTenantId } = await import('./tenantService');
    setTenantId('tnt_test');
    try {
      const { submitApplication } = await import('./applicationsService.js');
      const result = await submitApplication({
        email: 'trabajador2@test.com',
        password: 'secret123',
        name: 'Ana Multi',
        dni: '87654321',
        phone: '999888777',
      });
      expect(result.success).toBe(true);
      // la app vive en el tenant resuelto (TenantResolver), NO en default
      const app = store.get('tenants/tnt_test/applications/new-uid-123');
      expect(app).toBeDefined();
      expect(app.status).toBe('pending');
      expect(store.get('tenants/default/applications/new-uid-123')).toBeUndefined();
    } finally {
      setTenantId('default');
    }
  });
});