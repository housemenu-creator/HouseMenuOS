import { ref, get, set, update } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { getDefaultRoles } from './permissions';
import { hashPin } from './crypto';
import { nowISO } from './format';
import { setTenantId } from './tenantService';

const STORAGE_KEY = 'house_tenant_id';

/**
 * Check if the system has any tenants configured.
 * Uses localStorage as a fast path — if a tenant ID was already stored,
 * it's definitely NOT the first run.
 */
export async function isFirstRun() {
  // Fast path: stored tenant → definitely not first run
  try {
    if (localStorage.getItem(STORAGE_KEY)) return false;
  } catch {
    // localStorage not available — fall through to RTDB check
  }

  try {
    const snap = await get(ref(db, 'tenants'));
    const data = snap.val();
    if (!data) return true;
    const keys = Object.keys(data);
    if (keys.length === 0) return true;
    for (const tid of keys) {
      const empSnap = await get(ref(db, `tenants/${tid}/employees`));
      if (empSnap.val() && Object.keys(empSnap.val()).length > 0) {
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('onboardingService.isFirstRun error:', err);
    return false;
  }
}

/**
 * Run the full setup transaction for a new tenant.
 *
 * @param {object} params
 * @param {string} params.anonUid — Firebase anonymous auth UID
 * @param {object} params.tenant — { name, description }
 * @param {object} params.admin — { name, email, pin }
 * @param {object} params.branch — { name, address, phone, schedule }
 * @returns {Promise<{success: boolean, tenantId?: string, branchId?: string, error?: string}>}
 */
export async function completeSetup({ anonUid, tenant, admin, branch }) {
  try {
    if (!anonUid) {
      return { success: false, error: 'No hay sesión anónima activa' };
    }
    if (!tenant?.name || !admin?.email || !admin?.pin || !branch?.name) {
      return { success: false, error: 'Faltan campos requeridos' };
    }

    const tenantId = generateId('tnt');
    const branchId = generateId('brn');

    const pinHash = await hashPin(admin.pin);
    const now = nowISO();

    // ── Employee record (keyed by anonUid → passes auth.uid === $uid) ──
    const employee = {
      profile: {
        name: admin.name,
        email: admin.email,
        pinHash,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      role: 'admin',
      branches: { [branchId]: true },
      homeBranch: branchId,
      firebaseUid: null,
    };

    // ── Roles (copy from defaults) ──
    const defaultRoles = getDefaultRoles();

    // ── Branch config ──
    const branchConfig = {
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
      schedule: branch.schedule || { open: '08:00', close: '23:00' },
      timezone: 'America/Lima',
      currency: 'PEN',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    // ── Kitchen hours ──
    const kitchenHours = generateKitchenHours(branch.schedule);

    // ── Marketing layout defaults ──
    const marketingLayout = {
      landingShowHero: true,
      landingShowFlashOffer: true,
      landingShowStats: true,
      landingShowValues: true,
      landingShowHighlights: true,
      cartaShowHero: false,
      cartaShowFlashOffer: false,
      cartaShowDailyMenu: true,
      cartaShowHighlights: false,
    };

    // ── Default catalog categories (seed) ──
    const catalogCategories = {
      entrantes: {
        name: 'Entrantes',
        description: 'Para empezar',
        sortOrder: 0,
        active: true,
      },
      principales: {
        name: 'Platos Principales',
        description: 'Nuestros clásicos',
        sortOrder: 1,
        active: true,
      },
      bebidas: {
        name: 'Bebidas',
        description: 'Gaseosas, jugos y más',
        sortOrder: 2,
        active: true,
      },
      postres: {
        name: 'Postres',
        description: 'El mejor cierre',
        sortOrder: 3,
        active: true,
      },
    };

    // ── Atomic update ──
    const payload = {
      // Tenant tree
      [`tenants/${tenantId}/employees/${anonUid}`]: employee,
      [`tenants/${tenantId}/roles`]: defaultRoles,
      // Branch tree
      [`branches/${branchId}/config`]: branchConfig,
      [`branches/${branchId}/_role_cache/${anonUid}`]: 'admin',
      [`branches/${branchId}/catalog/_meta`]: {
        name: branch.name,
        currency: 'PEN',
        updatedAt: now,
      },
      [`branches/${branchId}/catalog/categories`]: catalogCategories,
      // Branch config (legacy)
      [`branches_config/${branchId}/kitchenHours`]: kitchenHours,
      [`branches_config/${branchId}/branchName`]: branch.name,
      [`branches_config/${branchId}/marketingLayout`]: marketingLayout,
      // Tenant metadata
      [`tenants/${tenantId}/_meta`]: {
        name: tenant.name,
        description: tenant.description || '',
        createdAt: now,
        defaultBranch: branchId,
      },
    };

    await update(ref(db), payload);

    // Persist tenant ID so the app reads from the right path on reload
    setTenantId(tenantId);

    return { success: true, tenantId, branchId };
  } catch (err) {
    console.error('onboardingService.completeSetup error:', err);
    return { success: false, error: err.message || 'Error al crear el restaurante' };
  }
}

// ── Helpers ──

function generateId(prefix) {
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return `${prefix}_${rand}`;
}

function generateKitchenHours(schedule) {
  const open = schedule?.open || '08:00';
  const close = schedule?.close || '23:00';
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  return days.map((day, i) => ({
    day,
    dayIndex: i,
    open,
    close,
    isActive: i < 6,
  }));
}
