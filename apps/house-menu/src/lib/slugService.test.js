import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSlug, isSlugAvailable, resolveSlug, registerSlug, updateSlug } from './slugService';

// ── In-memory store logic ──
const data = {};
const store = {
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
    if (parts.length > 0) {
      cur[parts[parts.length - 1]] = val;
    }
  },
  clear: () => {
    Object.keys(data).forEach(k => delete data[k]);
  }
};

// ── Mocks ──
vi.mock('@house/db', () => ({
  realtimeDB: {},
}));

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db, path) => ({ path })),
  get: vi.fn(async (refObj) => {
    const val = store.get(refObj.path);
    return {
      val: () => val,
      exists: () => val !== undefined && val !== null,
    };
  }),
  set: vi.fn(async (refObj, val) => {
    store.set(refObj.path, val);
  }),
  update: vi.fn(async (refObj, payload) => {
    // Si no hay path (ref raíz), actualiza rutas absolutas del payload
    const basePath = refObj.path || '';
    for (const [key, val] of Object.entries(payload)) {
      const fullPath = basePath ? `${basePath}/${key}` : key;
      if (val === null) {
        // En firebase, setear a null elimina el nodo
        const parts = fullPath.split('/').filter(Boolean);
        let cur = data;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!cur[parts[i]]) return;
          cur = cur[parts[i]];
        }
        if (parts.length > 0) {
          delete cur[parts[parts.length - 1]];
        }
      } else {
        store.set(fullPath, val);
      }
    }
  }),
}));

describe('slugService', () => {
  beforeEach(() => {
    store.clear();
  });

  describe('generateSlug', () => {
    it('debe normalizar textos correctamente', () => {
      expect(generateSlug('Sushi Sakura')).toBe('sushi-sakura');
      expect(generateSlug('  El Asador del Norte!! ')).toBe('el-asador-del-norte');
      expect(generateSlug('pizzeria_y_pastas')).toBe('pizzeria_y_pastas');
      expect(generateSlug('')).toBe('');
      expect(generateSlug(null)).toBe('');
    });
  });

  describe('isSlugAvailable', () => {
    it('debe retornar true si el slug no existe', async () => {
      const available = await isSlugAvailable('pizzita-123');
      expect(available).toBe(true);
    });

    it('debe retornar false si el slug ya existe', async () => {
      store.set('global/slugs/pizzita-123', { tenantId: 'tnt_123', branchId: 'brn_456' });
      const available = await isSlugAvailable('pizzita-123');
      expect(available).toBe(false);
    });
  });

  describe('registerSlug', () => {
    it('debe guardar el slug en el indice global y en _meta del tenant', async () => {
      const res = await registerSlug('Burger Club', 'tnt_burger', 'brn_burger1');
      expect(res.success).toBe(true);
      expect(store.get('global/slugs/burger-club')).toBeDefined();
      expect(store.get('global/slugs/burger-club').tenantId).toBe('tnt_burger');
      expect(store.get('tenants/tnt_burger/_meta/slug')).toBe('burger-club');
    });

    it('debe fallar si el slug ya está en uso', async () => {
      store.set('global/slugs/burger-club', { tenantId: 'tnt_another' });
      const res = await registerSlug('Burger Club', 'tnt_burger', 'brn_burger1');
      expect(res.success).toBe(false);
      expect(res.error).toBe('El slug ya está en uso');
    });
  });

  describe('resolveSlug', () => {
    it('debe retornar tenantId y branchId para un slug existente', async () => {
      store.set('global/slugs/sushi-san', { tenantId: 'tnt_sushi', branchId: 'brn_sushi1' });
      const res = await resolveSlug('sushi-san');
      expect(res).toEqual({ tenantId: 'tnt_sushi', branchId: 'brn_sushi1' });
    });

    it('debe retornar null para un slug inexistente', async () => {
      const res = await resolveSlug('inexistente');
      expect(res).toBeNull();
    });
  });

  describe('updateSlug', () => {
    it('debe actualizar el slug y borrar el viejo', async () => {
      store.set('global/slugs/old-name', { tenantId: 'tnt_1', branchId: 'brn_1' });
      store.set('tenants/tnt_1/_meta/slug', 'old-name');

      const res = await updateSlug('old-name', 'new-name', 'tnt_1', 'brn_1');
      expect(res.success).toBe(true);
      expect(store.get('global/slugs/new-name')).toBeDefined();
      expect(store.get('global/slugs/old-name')).toBeUndefined();
      expect(store.get('tenants/tnt_1/_meta/slug')).toBe('new-name');
    });

    it('no debe hacer nada si el slug es el mismo', async () => {
      store.set('global/slugs/same-name', { tenantId: 'tnt_1', branchId: 'brn_1' });
      const res = await updateSlug('same-name', 'same-name', 'tnt_1', 'brn_1');
      expect(res.success).toBe(true);
      expect(store.get('global/slugs/same-name')).toBeDefined();
    });
  });
});
