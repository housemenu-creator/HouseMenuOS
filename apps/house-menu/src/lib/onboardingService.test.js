import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── In-memory store (same pattern as services.test.js) ──
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
    clear: () => { Object.keys(data).forEach(k => delete data[k]); },
  };
}

let store;
let capturedTenantId;

// ── Mocks ──

vi.mock('@house/db', () => ({
  realtimeDB: {},
  auth: { currentUser: null },
}));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn((_db, path) => ({ path })),
  get: vi.fn(async (ref) => {
    const v = store.get(ref.path);
    return { val: () => v, exists: () => v !== undefined && v !== null };
  }),
  set: vi.fn(async (ref, val) => { store.set(ref.path, val); }),
  update: vi.fn(async (ref, data) => {
    if (!ref.path) {
      for (const [path, val] of Object.entries(data)) {
        store.set(path, val);
      }
      return;
    }
    const hasMultiPath = Object.keys(data).some(k => k.includes('/'));
    if (hasMultiPath) {
      for (const [key, val] of Object.entries(data)) {
        store.set(`${ref.path}/${key}`, val);
      }
      return;
    }
    const existing = store.get(ref.path) || {};
    store.set(ref.path, { ...existing, ...data });
  }),
  push: vi.fn(() => {}),
  remove: vi.fn(() => {}),
  onValue: vi.fn(() => () => {}),
  off: vi.fn(() => {}),
  query: vi.fn((ref) => ref),
  orderByChild: vi.fn(() => ({})),
  limitToLast: vi.fn(() => ({})),
}));

// Mock crypto for deterministic PIN hashing
vi.mock('./crypto', () => ({
  hashPin: vi.fn(async (pin) => `mock_hash_${pin}`),
  verifyPinHash: vi.fn(async (pin, hash) => hash === `mock_hash_${pin}`),
}));

// Mock permissions to return predictable roles
vi.mock('./permissions', () => ({
  getDefaultRoles: vi.fn(() => ({
    admin: { name: 'Administrador', permissions: { '*': true } },
    kitchen: { name: 'Cocina', permissions: { 'orders:read': true } },
  })),
}));

// Mock format for deterministic timestamps
vi.mock('./format', () => ({
  nowISO: vi.fn(() => '2026-06-17T12:00:00.000Z'),
}));

// Mock tenantService — captures tenant ID for assertions
vi.mock('./tenantService', () => ({
  setTenantId: vi.fn((id) => { capturedTenantId = id; }),
  getTenantId: vi.fn(() => capturedTenantId || 'default'),
  tenantRef: vi.fn((sub) => {
    const base = `tenants/${capturedTenantId || 'default'}`;
    return { path: sub ? `${base}/${sub}` : base, key: capturedTenantId || 'default' };
  }),
  tenantPath: vi.fn((sub) => `tenants/${capturedTenantId || 'default'}/${sub}`),
}));

beforeEach(() => {
  store = createStore();
  capturedTenantId = null;
  vi.clearAllMocks();
  // Clear localStorage before each test
  try { localStorage.removeItem('house_tenant_id'); } catch {}
});

// ─────────────────────────────────────────────────────────
//  isFirstRun
// ─────────────────────────────────────────────────────────
describe('isFirstRun', () => {
  it('returns false when localStorage has a stored tenant ID', async () => {
    try { localStorage.setItem('house_tenant_id', 'tnt_abc123'); } catch {}
    const { isFirstRun } = await import('./onboardingService');
    expect(await isFirstRun()).toBe(false);
  });

  it('returns false when RTDB has tenants with employees', async () => {
    store.set('branches_config/branch-1/name', 'Local Centro');
    const { isFirstRun } = await import('./onboardingService');
    expect(await isFirstRun()).toBe(false);
  });

  it('returns true when RTDB has no tenants at all', async () => {
    const { isFirstRun } = await import('./onboardingService');
    expect(await isFirstRun()).toBe(true);
  });

  it('returns true when RTDB has tenants but no employees in any', async () => {
    store.set('tenants/tnt_abc/_meta', { name: 'Test' });
    const { isFirstRun } = await import('./onboardingService');
    expect(await isFirstRun()).toBe(true);
  });

  it('returns false (safe) when RTDB read errors', async () => {
    // Monkey-patch get to throw
    const db = await import('firebase/database');
    db.get.mockRejectedValueOnce(new Error('Network error'));
    const { isFirstRun } = await import('./onboardingService');
    expect(await isFirstRun()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
//  completeSetup
// ─────────────────────────────────────────────────────────
describe('completeSetup', () => {
  const VALID_PARAMS = {
    anonUid: 'anon_test_123',
    tenant: { name: 'Mi Restaurante', description: 'Comida peruana' },
    admin: { name: 'Juan Pérez', email: 'juan@test.com', pin: '7245' },
    branch: {
      name: 'Local Centro',
      address: 'Av. Principal 123',
      phone: '999 888 777',
      schedule: { open: '09:00', close: '22:00' },
    },
  };

  it('returns error when anonUid is missing', async () => {
    const { completeSetup } = await import('./onboardingService');
    const result = await completeSetup({ ...VALID_PARAMS, anonUid: null });
    expect(result.success).toBe(false);
    expect(result.error).toContain('anónima');
  });

  it('returns error when required fields are missing', async () => {
    const { completeSetup } = await import('./onboardingService');
    const result = await completeSetup({ anonUid: 'anon_x', tenant: { name: '' }, admin: {}, branch: {} });
    expect(result.success).toBe(false);
    expect(result.error).toContain('requeridos');
  });

  it('creates employee record keyed by anonymous UID', async () => {
    const { completeSetup } = await import('./onboardingService');
    const result = await completeSetup(VALID_PARAMS);
    expect(result.success).toBe(true);
    expect(result.tenantId).toBeDefined();
    expect(result.branchId).toBeDefined();

    const emp = store.get(`tenants/${result.tenantId}/employees/anon_test_123`);
    expect(emp).toBeDefined();
    expect(emp.role).toBe('admin');
    expect(emp.profile.email).toBe('juan@test.com');
    expect(emp.profile.name).toBe('Juan Pérez');
    expect(emp.profile.pinHash).toBe('mock_hash_7245');
    expect(emp.branches[result.branchId]).toBe(true);
  });

  it('creates roles from defaults', async () => {
    const { completeSetup } = await import('./onboardingService');
    const result = await completeSetup(VALID_PARAMS);
    const roles = store.get(`tenants/${result.tenantId}/roles`);
    expect(roles).toBeDefined();
    expect(roles.admin).toBeDefined();
    expect(roles.kitchen).toBeDefined();
  });

  it('creates branch config with correct data', async () => {
    const { completeSetup } = await import('./onboardingService');
    const result = await completeSetup(VALID_PARAMS);
    const config = store.get(`branches/${result.branchId}/config`);
    expect(config).toBeDefined();
    expect(config.name).toBe('Local Centro');
    expect(config.address).toBe('Av. Principal 123');
    expect(config.phone).toBe('999 888 777');
    expect(config.status).toBe('active');
    expect(config.timezone).toBe('America/Lima');
  });

  it('writes _role_cache for the admin UID', async () => {
    const { completeSetup } = await import('./onboardingService');
    const result = await completeSetup(VALID_PARAMS);
    const cache = store.get(`branches/${result.branchId}/_role_cache/anon_test_123`);
    expect(cache).toBe('admin');
  });

  it('creates catalog with seed categories', async () => {
    const { completeSetup } = await import('./onboardingService');
    const result = await completeSetup(VALID_PARAMS);
    const categories = store.get(`branches/${result.branchId}/catalog/categories`);
    expect(categories).toBeDefined();
    expect(categories.entrantes).toBeDefined();
    expect(categories.principales).toBeDefined();
    expect(categories.bebidas).toBeDefined();
    expect(categories.postres).toBeDefined();
  });

  it('creates kitchen hours in branches_config', async () => {
    const { completeSetup } = await import('./onboardingService');
    const result = await completeSetup(VALID_PARAMS);
    const hours = store.get(`branches_config/${result.branchId}/kitchenHours`);
    expect(hours).toBeDefined();
    expect(hours).toHaveLength(7);
    // Sunday (index 6) should be inactive by default
    const sunday = hours.find(h => h.dayIndex === 6);
    expect(sunday.isActive).toBe(false);
  });

  it('creates marketing layout defaults in branches_config', async () => {
    const { completeSetup } = await import('./onboardingService');
    const result = await completeSetup(VALID_PARAMS);
    const layout = store.get(`branches_config/${result.branchId}/marketingLayout`);
    expect(layout).toBeDefined();
    expect(layout.landingShowHero).toBe(true);
    expect(layout.cartaShowDailyMenu).toBe(true);
    expect(layout.cartaShowHero).toBe(false);
  });

  it('calls setTenantId with the new tenant ID', async () => {
    const { completeSetup } = await import('./onboardingService');
    const result = await completeSetup(VALID_PARAMS);
    expect(capturedTenantId).toBe(result.tenantId);
  });

  it('reports error when RTDB write fails', async () => {
    const db = await import('firebase/database');
    db.update.mockRejectedValueOnce(new Error('write denied'));
    const { completeSetup } = await import('./onboardingService');
    const result = await completeSetup(VALID_PARAMS);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
