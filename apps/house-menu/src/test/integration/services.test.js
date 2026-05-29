import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── In-memory store ──────────────────────────────────────
function createStore() {
  const data = {};
  return {
    get: (path) => {
      const parts = path.split('/').filter(Boolean);
      let cur = data;
      for (const p of parts) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[p];
      }
      return cur;
    },
    set: (path, val) => {
      const parts = path.split('/').filter(Boolean);
      let cur = data;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
    },
    del: (path) => {
      const parts = path.split('/').filter(Boolean);
      let cur = data;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) return;
        cur = cur[parts[i]];
      }
      delete cur[parts[parts.length - 1]];
    },
  };
}

let store;
let pushCounter;

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn(() => { throw new Error('CF n/a'); })),
}));
vi.mock('@house/db', () => {
  const app = {};
  app.options = { projectId: 'test', apiKey: 'test' };
  app.automaticDataCollectionEnabled = false;
  return { realtimeDB: {}, app };
});

// Use define from vitest to set up a factory that captures current store
vi.mock('firebase/database', () => {
  return {
    getDatabase: vi.fn(() => ({})),
    ref: vi.fn((_db, path) => ({ path })),
    push: vi.fn((parentRef) => {
      const key = `k_${++pushCounter}`;
      return { path: `${parentRef.path}/${key}`, key };
    }),
    set: vi.fn(async (ref, val) => { store.set(ref.path, val); }),
    update: vi.fn(async (ref, data) => {
      const existing = store.get(ref.path) || {};
      store.set(ref.path, { ...existing, ...data });
    }),
    get: vi.fn(async (ref) => {
      const v = store.get(ref.path);
      return { val: () => v, exists: () => v !== undefined && v !== null };
    }),
    onValue: vi.fn((ref, cb) => {
      const val = store.get(ref.path);
      cb({ val: () => val });
      return () => {};
    }),
    off: vi.fn(() => {}),
    remove: vi.fn(async (ref) => store.del(ref.path)),
    query: vi.fn((ref) => ref),
    limitToLast: vi.fn(() => ({})),
    serverTimestamp: vi.fn(() => new Date().toISOString()),
    runTransaction: vi.fn(async (ref, updateFn) => {
      const oldVal = store.get(ref.path);
      const newVal = updateFn(oldVal);
      if (newVal !== undefined) {
        store.set(ref.path, newVal);
        return { committed: true };
      }
      return { committed: false };
    }),
  };
});

// Mock tenantService so auth tests can run without real Firebase
vi.mock('bcryptjs', async (importOriginal) => {
  return {
    default: {
      hash: (pin, salt) => Promise.resolve(`$2a$${salt}_hashed_${pin}`),
      compare: (pin, hash) => Promise.resolve(hash === `$2a$10_hashed_${pin}`),
    },
    hash: (pin, salt) => Promise.resolve(`$2a$${salt}_hashed_${pin}`),
    compare: (pin, hash) => Promise.resolve(hash === `$2a$10_hashed_${pin}`),
  };
});

vi.mock('../lib/tenantService', () => ({
  tenantRef: (sub) => {
    const base = 'tenants/default';
    return { path: sub ? `${base}/${sub}` : base, key: 'default' };
  },
  tenantPath: (sub) => `tenants/default/${sub}`,
  defaultTenant: 'default',
}));

beforeEach(async () => {
  store = createStore();
  pushCounter = 0;
  vi.resetModules();
});

// ─────────────────────────────────────────────────────────
//  deliveryService
// ─────────────────────────────────────────────────────────
describe('deliveryService', () => {
  const B = 'branch-a';

  it('creates a driver', async () => {
    const { deliveryService: ds } = await import('../../lib/deliveryService.js');
    const r = await ds.createDriver(B, { name: 'Juan', phone: '999888777', vehicle: 'Moto' });
    expect(r.success).toBe(true);
    expect(r.driverId).toBeDefined();
    const driver = store.get(`branches/${B}/delivery/drivers/${r.driverId}`);
    expect(driver.name).toBe('Juan');
    expect(driver.phone).toBe('999888777');
    expect(driver.active).toBe(true);
    expect(driver.available).toBe(true);
  });

  it('updates a driver', async () => {
    const { deliveryService: ds } = await import('../../lib/deliveryService.js');
    const { driverId } = await ds.createDriver(B, { name: 'Maria', phone: '111222333' });
    await ds.updateDriver(B, driverId, { phone: '444555666', available: false });
    const driver = store.get(`branches/${B}/delivery/drivers/${driverId}`);
    expect(driver.phone).toBe('444555666');
    expect(driver.available).toBe(false);
  });

  it('deletes a driver', async () => {
    const { deliveryService: ds } = await import('../../lib/deliveryService.js');
    const { driverId } = await ds.createDriver(B, { name: 'Pedro' });
    await ds.deleteDriver(B, driverId);
    const driver = store.get(`branches/${B}/delivery/drivers/${driverId}`);
    expect(driver).toBeUndefined();
  });

  it('subscribes to drivers', async () => {
    const { deliveryService: ds } = await import('../../lib/deliveryService.js');
    store.set(`branches/${B}/delivery/drivers/d1`, { name: 'Carlos', active: true, available: true });
    store.set(`branches/${B}/delivery/drivers/d2`, { name: 'Ana', active: true, available: true });
    const drivers = await new Promise((resolve) => {
      ds.subscribeToDrivers(B, (d) => resolve(d));
    });
    expect(drivers).toHaveLength(2);
    expect(drivers.map(d => d.name)).toContain('Carlos');
    expect(drivers.map(d => d.name)).toContain('Ana');
  });

  it('creates a delivery zone', async () => {
    const { deliveryService: ds } = await import('../../lib/deliveryService.js');
    const r = await ds.createZone(B, { name: 'Centro', fee: 5, estimatedMinutes: 20, priority: 1 });
    expect(r.success).toBe(true);
    const zone = store.get(`branches/${B}/delivery/zones/${r.zoneId}`);
    expect(zone.name).toBe('Centro');
    expect(zone.fee).toBe(5);
    expect(zone.estimatedMinutes).toBe(20);
  });

  it('updates a zone', async () => {
    const { deliveryService: ds } = await import('../../lib/deliveryService.js');
    const { zoneId } = await ds.createZone(B, { name: 'Norte', fee: 8 });
    await ds.updateZone(B, zoneId, { fee: 10, active: false });
    const zone = store.get(`branches/${B}/delivery/zones/${zoneId}`);
    expect(zone.fee).toBe(10);
    expect(zone.active).toBe(false);
  });

  it('deletes a zone', async () => {
    const { deliveryService: ds } = await import('../../lib/deliveryService.js');
    const { zoneId } = await ds.createZone(B, { name: 'Sur', fee: 6 });
    await ds.deleteZone(B, zoneId);
    const zone = store.get(`branches/${B}/delivery/zones/${zoneId}`);
    expect(zone).toBeUndefined();
  });

  it('assigns a driver to an order', async () => {
    store.set(`branches/${B}/orders/o1`, { id: 'o1', status: 'listo', customerName: 'Test' });
    const { deliveryService: ds } = await import('../../lib/deliveryService.js');
    const r = await ds.assignDriver(B, 'o1', 'd1', 'Carlos');
    expect(r.success).toBe(true);
    const order = store.get(`branches/${B}/orders/o1`);
    expect(order.driverId).toBe('d1');
    expect(order.driverName).toBe('Carlos');
    expect(order.status).toBe('en_camino');
    const logs = store.get(`branches/${B}/delivery/logs`);
    const logEntry = Object.values(logs)[0];
    expect(logEntry.orderId).toBe('o1');
    expect(logEntry.driverId).toBe('d1');
    expect(logEntry.status).toBe('en_camino');
  });

  it('unassigns a driver from an order', async () => {
    store.set(`branches/${B}/orders/o1`, { id: 'o1', status: 'en_camino', driverId: 'd1', driverName: 'Carlos' });
    store.set(`branches/${B}/delivery/logs/l1`, { orderId: 'o1', driverId: 'd1', status: 'en_camino' });
    const { deliveryService: ds } = await import('../../lib/deliveryService.js');
    const r = await ds.unassignDriver(B, 'o1');
    expect(r.success).toBe(true);
    const order = store.get(`branches/${B}/orders/o1`);
    expect(order.driverId).toBeNull();
    expect(order.status).toBe('listo');
    const logEntry = store.get(`branches/${B}/delivery/logs/l1`);
    expect(logEntry.status).toBe('unassigned');
  });

  it('confirms delivery and increments driver count', async () => {
    store.set(`branches/${B}/orders/o1`, { id: 'o1', status: 'en_camino' });
    store.set(`branches/${B}/delivery/logs/l1`, { orderId: 'o1', status: 'en_camino' });
    store.set(`branches/${B}/delivery/drivers/d1`, { name: 'Carlos', totalDeliveries: 5, available: false });
    const { deliveryService: ds } = await import('../../lib/deliveryService.js');
    const r = await ds.confirmDelivery(B, 'o1', 'd1');
    expect(r.success).toBe(true);
    const order = store.get(`branches/${B}/orders/o1`);
    expect(order.status).toBe('entregado');
    expect(order.deliveredAt).toBeDefined();
    const driver = store.get(`branches/${B}/delivery/drivers/d1`);
    expect(driver.totalDeliveries).toBe(6);
    expect(driver.available).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
//  cashService
// ─────────────────────────────────────────────────────────
describe('cashService', () => {
  const B = 'branch-a';

  it('opens a cash session', async () => {
    const { cashService: cs } = await import('../../lib/cashService.js');
    const r = await cs.openSession(B, { openingBalance: 200, openedBy: 'admin@test.com', notes: 'Turno mañana' });
    expect(r.success).toBe(true);
    const session = store.get(`branches/${B}/cash_sessions/${r.sessionId}`);
    expect(session.status).toBe('open');
    expect(session.openingBalance).toBe(200);
    expect(session.openedBy).toBe('admin@test.com');
    expect(session.notes).toBe('Turno mañana');
  });

  it('closes an open session', async () => {
    const { cashService: cs } = await import('../../lib/cashService.js');
    const { sessionId } = await cs.openSession(B, { openingBalance: 100, openedBy: 'admin' });
    const r = await cs.closeSession(B, sessionId, { closingBalance: 580, expectedCash: 500, closedBy: 'admin', notes: 'Cierre OK' });
    expect(r.success).toBe(true);
    const session = store.get(`branches/${B}/cash_sessions/${sessionId}`);
    expect(session.status).toBe('closed');
    expect(session.closingBalance).toBe(580);
    expect(session.difference).toBe(80);
    expect(session.closedBy).toBe('admin');
  });

  it('finds the active session', async () => {
    const { cashService: cs } = await import('../../lib/cashService.js');
    await cs.openSession(B, { openingBalance: 50, openedBy: 'admin' });
    const active = await cs.getActiveSession(B);
    expect(active).not.toBeNull();
    expect(active.status).toBe('open');
    expect(active.openingBalance).toBe(50);
  });

  it('prevents closing an already-closed session', async () => {
    const { cashService: cs } = await import('../../lib/cashService.js');
    const { sessionId } = await cs.openSession(B, { openingBalance: 100, openedBy: 'admin' });
    await cs.closeSession(B, sessionId, { closingBalance: 150, expectedCash: 150, closedBy: 'admin' });
    const r = await cs.closeSession(B, sessionId, { closingBalance: 200, expectedCash: 200, closedBy: 'admin' });
    expect(r.success).toBe(false);
    expect(r.error).toBe('Esta sesion ya fue cerrada');
  });

  it('returns null when no active session', async () => {
    const { cashService: cs } = await import('../../lib/cashService.js');
    const active = await cs.getActiveSession(B);
    expect(active).toBeNull();
  });

  it('subscribes to sessions', async () => {
    store.set(`branches/${B}/cash_sessions/s1`, { status: 'open', openedAt: 1000, openingBalance: 200 });
    store.set(`branches/${B}/cash_sessions/s2`, { status: 'closed', openedAt: 500, closingBalance: 300 });
    const { cashService: cs } = await import('../../lib/cashService.js');
    const sessions = await new Promise((resolve) => {
      cs.subscribeToSessions(B, (s) => resolve(s));
    });
    expect(sessions).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────
//  authService
// ─────────────────────────────────────────────────────────
describe('authService', () => {
  it('verifies default admin PIN', async () => {
    const { verifyPin } = await import('../../lib/authService.js');
    const r = await verifyPin('admin@house.local', 'admin');
    expect(r.success).toBe(true);
    expect(r.user.role).toBe('admin');
    expect(r.user.permissions['orders:read']).toBe(true);
    expect(r.user.permissions['menu:read']).toBe(true);
  });

  it('verifies default kitchen PIN', async () => {
    const { verifyPin } = await import('../../lib/authService.js');
    const r = await verifyPin('cocina@house.local', '1234');
    expect(r.success).toBe(true);
    expect(r.user.role).toBe('kitchen');
    expect(r.user.permissions['orders:read']).toBe(true);
  });

  it('rejects wrong PIN for default user', async () => {
    const { verifyPin } = await import('../../lib/authService.js');
    const r = await verifyPin('admin@house.local', 'wrong');
    expect(r.success).toBe(false);
    expect(r.error).toBe('Credenciales incorrectas');
  });

  it('verifies a Firebase-stored user with PIN', async () => {
    store.set('tenants/default/users/u1', { email: 'chef@rest.com', name: 'Chef', pin: '4321', active: true });
    store.set('tenants/default/memberships/m1', { userId: 'u1', roleId: 'kitchen', branchIds: { hq: true }, active: true });
    store.set('tenants/default/roles', {
      admin: { name: 'Admin', permissions: { 'orders:read': true, 'users:manage': true } },
      kitchen: { name: 'Cocina', permissions: { 'orders:read': true, 'orders:create': true } },
    });
    const { verifyPin } = await import('../../lib/authService.js');
    const r = await verifyPin('chef@rest.com', '4321');
    expect(r.success).toBe(true);
    expect(r.user.role).toBe('kitchen');
    expect(r.user.name).toBe('Chef');
    expect(r.user.permissions['orders:read']).toBe(true);
  });

  it('rejects user without membership', async () => {
    store.set('tenants/default/users/u2', { email: 'nobody@rest.com', name: 'Nobody', pin: '0000', active: true });
    const { verifyPin } = await import('../../lib/authService.js');
    const r = await verifyPin('nobody@rest.com', '0000');
    expect(r.success).toBe(false);
    expect(r.error).toBe('Usuario sin asignación a una sucursal');
  });

  it('findUserByFirebaseUid returns null for unknown uid', async () => {
    const { findUserByFirebaseUid } = await import('../../lib/authService.js');
    const r = await findUserByFirebaseUid('unknown-uid');
    expect(r).toBeNull();
  });

  it('ensureFirebaseUser creates user if not found', async () => {
    const { ensureFirebaseUser } = await import('../../lib/authService.js');
    const r = await ensureFirebaseUser({ uid: 'new-uid-123', email: 'new@rest.com', displayName: 'New Chef' });
    expect(r.success).toBe(true);
    expect(r.user.role).toBe('kitchen');
    expect(r.user.email).toBe('new@rest.com');
    const user = store.get('tenants/default/users');
    const userEntry = Object.values(user).find(u => u.firebaseUid === 'new-uid-123');
    expect(userEntry).toBeDefined();
    expect(userEntry.name).toBe('New Chef');
    const memberships = store.get('tenants/default/memberships');
    expect(Object.values(memberships).some(m => m.userId === r.user.id)).toBe(true);
  });

  it('hasPermission checks correctly', async () => {
    const { hasPermission } = await import('../../lib/authService.js');
    expect(hasPermission({ 'orders:read': true }, 'orders:read')).toBe(true);
    expect(hasPermission({ 'orders:read': true }, 'menu:read')).toBe(false);
    expect(hasPermission({ '*': true }, 'anything')).toBe(true);
    expect(hasPermission({ admin: true }, 'anything')).toBe(true);
    expect(hasPermission({}, 'anything')).toBe(false);
  });

  describe('PIN hashing', () => {
    it('migrates plaintext PIN to hash on successful login', async () => {
      store.set('tenants/default/users/u1', { email: 'chef@rest.com', name: 'Chef', pin: '4321', active: true });
      store.set('tenants/default/memberships/m1', { userId: 'u1', roleId: 'kitchen', branchIds: { hq: true }, active: true });
      store.set('tenants/default/roles', {
        admin: { name: 'Admin', permissions: { 'orders:read': true } },
        kitchen: { name: 'Cocina', permissions: { 'orders:read': true } },
      });
      const { verifyPin } = await import('../../lib/authService.js');
      const r = await verifyPin('chef@rest.com', '4321');
      expect(r.success).toBe(true);
      const user = store.get('tenants/default/users/u1');
      expect(user.pinHash).toBeDefined();
      expect(user.pinHash).toContain('hashed');
      expect(user.pin).toBeNull();
    });

    it('verifies hashed PIN correctly', async () => {
      store.set('tenants/default/users/u2', { email: 'cook@rest.com', name: 'Cook', pinHash: '$2a$10_hashed_9999', active: true });
      store.set('tenants/default/memberships/m2', { userId: 'u2', roleId: 'kitchen', branchIds: { hq: true }, active: true });
      store.set('tenants/default/roles', {
        kitchen: { name: 'Cocina', permissions: { 'orders:read': true } },
      });
      const { verifyPin } = await import('../../lib/authService.js');
      const ok = await verifyPin('cook@rest.com', '9999');
      expect(ok.success).toBe(true);
      const bad = await verifyPin('cook@rest.com', 'wrong');
      expect(bad.success).toBe(false);
    });

    it('createUser stores pinHash not plaintext pin', async () => {
      const { createUser } = await import('../../lib/authService.js');
      const r = await createUser({ email: 'new@rest.com', name: 'New', role: 'kitchen', pin: '1234' });
      expect(r.success).toBe(true);
      const user = store.get(`tenants/default/users/${r.userId}`);
      expect(user.pinHash).toBeDefined();
      expect(user.pinHash).toContain('hashed');
      expect(user.pin).toBeUndefined();
    });

    it('updateUser hashes pin when provided', async () => {
      store.set('tenants/default/users/u3', { email: 'update@rest.com', name: 'Update', pinHash: '$2a$10_hashed_old', active: true });
      const { updateUser } = await import('../../lib/authService.js');
      await updateUser('u3', { pin: 'newpin' });
      const user = store.get('tenants/default/users/u3');
      expect(user.pinHash).toContain('newpin');
      expect(user.pin).toBeUndefined();
    });
  });
});
