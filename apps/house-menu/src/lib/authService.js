import { ref, get, set, push, update, remove, onValue } from 'firebase/database';
import { realtimeDB as db, auth } from '@house/db';
import { getDefaultRoles, hasPermission } from './permissions';
import { getDefaultUsers } from './roleRegistry';
import { tenantRef, tenantPath } from './tenantService';
import { nowISO } from './format';
import { auditLog } from './auditService';
import { hashPin, verifyPinHash } from './crypto';

/** Fallback users when RTDB is unreachable (no Firebase Auth session yet) — only in dev */
const DEFAULT_USERS = getDefaultUsers();

/**
 * Ensure Firebase Auth before reading RTDB (rules require auth != null).
 * Does NOT re-init anonymous auth — relies on initAnonymousAuth() called at startup.
 * If auth is null, RTDB read will fail and findUserByEmail returns null,
 * allowing the DEFAULT_USERS fallback to handle PIN login.
 */
async function ensureFirebaseReadAccess() {
  if (auth?.currentUser) return;
  // No auth session — RTDB read will be rejected by rules, caught by findUserByEmail
}

/**
 * Normalise an employee RTDB record into the flat shape consumed by the app.
 * Employee data can be stored as `{ profile: { name, email, ... }, role, branches, ... }`
 * OR flat `{ name, email, role, ... }` (migration in progress) — this normaliser handles both.
 */
function normaliseEmployee(id, record) {
  if (!record) return null;
  const profile = record.profile || record;
  return {
    id,
    email: profile.email || record.email || '',
    name: profile.name || record.name || '',
    role: record.role || 'kitchen',
    pinHash: profile.pinHash || record.pinHash || null,
    pin: profile.pin || record.pin || null,
    active: profile.active !== undefined ? profile.active : (record.active !== false),
    createdAt: profile.createdAt || record.createdAt || null,
    updatedAt: profile.updatedAt || record.updatedAt || null,
    firebaseUid: record.firebaseUid || null,
    branches: record.branches || { hq: true },
    homeBranch: record.homeBranch || null,
    profile,
  };
}

export async function verifyPin(email, pin) {
  // Default users first — always work for known email+pin combos (dev only)
  for (const du of DEFAULT_USERS) {
    if (du.email === email && du.pin === pin) {
      const roleDef = getDefaultRoles()[du.role];
      return {
        success: true,
        user: {
          id: du.id,
          email: du.email,
          name: du.name,
          role: du.role,
          permissions: roleDef?.permissions || {},
          branchIds: { hq: true },
        },
      };
    }
  }

  await ensureFirebaseReadAccess();
  const found = await findUserByEmail(email);
  if (!found) {
    return { success: false, error: 'Credenciales incorrectas' };
  }

  const hashToCheck = found.pinHash || found.profile?.pinHash;
  const plainToCheck = found.pin || found.profile?.pin;

  let valid = false;
  if (hashToCheck) {
    valid = await verifyPinHash(pin, hashToCheck);
  } else if (plainToCheck) {
    // Plaintext PIN — migrate to hash on successful login
    valid = plainToCheck === pin;
    if (valid) {
      const newHash = await hashPin(pin);
      try {
        await update(ref(db, tenantPath(`employees/${found.id}`)), {
          'profile/pinHash': newHash,
          'profile/pin': null,
          pinHash: newHash,
          pin: null,
        });
      } catch (err) {
        console.warn('authService: no se pudo migrar PIN a hash:', err);
      }
    }
  }

  if (!valid) {
    return { success: false, error: 'PIN incorrecto' };
  }

  // Role is directly on employee — no membership indirection
  const roles = await getRoles();
  const roleDef = roles[found.role] || getDefaultRoles()[found.role];
  if (!roleDef) {
    return { success: false, error: 'Rol no encontrado' };
  }

  return {
    success: true,
    user: {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
      permissions: roleDef?.permissions || {},
      branchIds: found.branches || { hq: true },
    },
  };
}

async function findUserByEmail(email) {
  try {
    const employeesRef = tenantRef('employees');
    const snapshot = await get(employeesRef);
    const allEmployees = snapshot.val();
    if (!allEmployees) return null;
    for (const [id, emp] of Object.entries(allEmployees)) {
      const normalised = normaliseEmployee(id, emp);
      if (normalised.email === email && normalised.active !== false) {
        return normalised;
      }
    }
    return null;
  } catch (err) {
    console.warn('authService.findUserByEmail error:', err);
    return null;
  }
}

export async function findUserByFirebaseUid(firebaseUid) {
  if (!firebaseUid) return null;

  // Direct read — employees are keyed by Firebase UID
  try {
    const empRef = tenantRef(`employees/${firebaseUid}`);
    const snapshot = await get(empRef);
    const data = snapshot.val();
    if (data) {
      const normalised = normaliseEmployee(firebaseUid, data);
      if (normalised.active !== false) return normalised;
    }
    // Fallback: scan all employees (handles migration where employee isn't yet keyed by UID)
    const allRef = tenantRef('employees');
    const allSnap = await get(allRef);
    const all = allSnap.val();
    if (!all) return null;
    for (const [id, emp] of Object.entries(all)) {
      const n = normaliseEmployee(id, emp);
      if (n.firebaseUid === firebaseUid && n.active !== false) {
        return n;
      }
    }
    return null;
  } catch (err) {
    console.warn('authService.findUserByFirebaseUid error:', err);
    return null;
  }
}

export async function ensureFirebaseUser(firebaseUser, defaultRole = 'kitchen', branchIds = { hq: true }) {
  const existing = await findUserByFirebaseUid(firebaseUser.uid);
  if (existing) {
    const roles = await getRoles();
    const roleDef = roles[existing.role] || getDefaultRoles()[existing.role];
    return {
      success: true,
      user: {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
        permissions: roleDef?.permissions || {},
        branchIds: existing.branches || branchIds,
      },
    };
  }

  // Not found by firebaseUid — search by email to link admin-created users
  const existingByEmail = await findUserByEmail(firebaseUser.email);
  if (existingByEmail) {
    const empKey = existingByEmail.id;
    try {
      await update(ref(db, tenantPath(`employees/${empKey}`)), {
        firebaseUid: firebaseUser.uid,
        'profile/name': existingByEmail.name || firebaseUser.displayName,
        name: existingByEmail.name || firebaseUser.displayName,
      });

      // Migrate role cache from old key (push ID or pending key) to firebaseUid key
      const cacheUpdates = {};
      const empBranches = existingByEmail.branches || branchIds;
      for (const branchId of Object.keys(empBranches)) {
        // Remove old entry keyed by push ID
        cacheUpdates[`branches/${branchId}/_role_cache/${empKey}`] = null;
        // Write new entry keyed by Firebase UID
        cacheUpdates[`branches/${branchId}/_role_cache/${firebaseUser.uid}`] = existingByEmail.role;
      }
      await update(ref(db), cacheUpdates);
    } catch (err) {
      console.warn('authService.ensureFirebaseUser: error al vincular firebaseUid:', err);
    }
    const roles = await getRoles();
    const roleDef = roles[existingByEmail.role] || getDefaultRoles()[existingByEmail.role];
    return {
      success: true,
      user: {
        id: existingByEmail.id,
        email: existingByEmail.email,
        name: existingByEmail.name,
        role: existingByEmail.role,
        permissions: roleDef?.permissions || {},
        branchIds: existingByEmail.branches || branchIds,
      },
    };
  }

  // Neither found — create new employee record
  const newEmployee = {
    profile: {
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
      email: firebaseUser.email,
      active: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    role: defaultRole,
    branches: branchIds,
    homeBranch: Object.keys(branchIds)[0] || null,
    firebaseUid: firebaseUser.uid,
  };

  try {
    const employeePath = tenantPath(`employees/${firebaseUser.uid}`);
    await set(ref(db, employeePath), newEmployee);

    // Sync role cache for all assigned branches
    const cacheUpdates = {};
    for (const branchId of Object.keys(branchIds)) {
      cacheUpdates[`branches/${branchId}/_role_cache/${firebaseUser.uid}`] = defaultRole;
    }
    if (Object.keys(cacheUpdates).length > 0) {
      await update(ref(db), cacheUpdates);
    }

    return {
      success: true,
      user: {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: newEmployee.profile.name,
        role: defaultRole,
        permissions: getDefaultRoles()[defaultRole]?.permissions || {},
        branchIds,
      },
    };
  } catch (err) {
    console.error('authService.ensureFirebaseUser error:', err);
    return { success: false, error: 'Error al crear usuario' };
  }
}

export async function createSession(user) {
  const token = crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    : Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  const sessionData = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
    branchIds: user.branchIds,
    createdAt: nowISO(),
    token,
  };
  // Only persist to RTDB if Firebase Auth is available (avoids PERMISSION_DENIED in dev)
  if (auth?.currentUser) {
    try {
      await set(ref(db, tenantPath(`sessions/${token}`)), sessionData);
    } catch (err) {
      console.warn('authService.createSession error:', err);
    }
  }
  return sessionData;
}

export async function getSession(token) {
  try {
    const snap = await get(ref(db, tenantPath(`sessions/${token}`)));
    return snap.val();
  } catch (err) {
    console.warn('authService.getSession error:', err);
    return null;
  }
}

export async function deleteSession(token) {
  if (!auth?.currentUser) return;
  try {
    await remove(ref(db, tenantPath(`sessions/${token}`)));
  } catch (err) {
    console.warn('authService.deleteSession error:', err);
  }
}

export function subscribeUsers(callback) {
  const employeesRef = tenantRef('employees');
  return onValue(employeesRef, (snap) => {
    const data = snap.val();
    if (!data) {
      if (import.meta.env.DEV) {
        callback(DEFAULT_USERS);
      } else {
        callback([]);
      }
      return;
    }
    const list = Object.entries(data).map(([id, emp]) => normaliseEmployee(id, emp));
    callback(list);
  });
}

export async function createUser({ email, name, role, pin, branchIds, actor }) {
  try {
    const employeesRef = tenantRef('employees');
    const newRef = push(employeesRef);
    const pinHash = await hashPin(pin);
    const employee = {
      profile: {
        name,
        email,
        pinHash,
        active: true,
        createdAt: nowISO(),
      },
      role,
      branches: branchIds || { hq: true },
      homeBranch: branchIds ? Object.keys(branchIds)[0] : null,
      firebaseUid: null,
    };
    await set(newRef, employee);

    // Sync role cache for all assigned branches
    const targetBranches = branchIds || { hq: true };
    const cacheUpdates = {};
    for (const branchId of Object.keys(targetBranches)) {
      cacheUpdates[`branches/${branchId}/_role_cache/${newRef.key}`] = role;
    }
    if (Object.keys(cacheUpdates).length > 0) {
      await update(ref(db), cacheUpdates);
    }

    auditLog('user.created', { userId: newRef.key, email, name, role, branchIds }, actor || 'system');
    return { success: true, userId: newRef.key };
  } catch (err) {
    console.error('authService.createUser error:', err);
    return { success: false, userId: null };
  }
}

export async function updateUser(userId, data, actor) {
  try {
    // Read current employee to compute role cache diff
    const currentSnap = await get(ref(db, tenantPath(`employees/${userId}`)));
    const current = currentSnap.val();
    const oldBranches = current?.branches || { hq: true };
    const oldRole = current?.role || 'kitchen';
    const newBranches = data.branchIds || oldBranches;
    const newRole = data.role || oldRole;

    // Build employee updates
    const updates = {};
    if (data.name !== undefined) updates['profile/name'] = data.name;
    if (data.email !== undefined) updates['profile/email'] = data.email;
    if (data.active !== undefined) updates['profile/active'] = data.active;
    if (data.pin) {
      updates['profile/pinHash'] = await hashPin(data.pin);
      updates['profile/pin'] = null;
    }
    if (data.role) updates.role = data.role;
    if (data.branchIds) updates.branches = data.branchIds;

    // Write changes directly to the employee record
    await update(ref(db, tenantPath(`employees/${userId}`)), updates);

    // Sync role cache for affected branches
    const cacheUpdates = {};
    // Remove from branches no longer assigned
    for (const branchId of Object.keys(oldBranches)) {
      if (!newBranches[branchId]) {
        cacheUpdates[`branches/${branchId}/_role_cache/${userId}`] = null; // delete
      }
    }
    // Set/add to new branches (or update role on existing)
    for (const branchId of Object.keys(newBranches)) {
      cacheUpdates[`branches/${branchId}/_role_cache/${userId}`] = newRole;
    }
    if (Object.keys(cacheUpdates).length > 0) {
      await update(ref(db), cacheUpdates);
    }

    auditLog('user.updated', { userId, ...data }, actor || 'system');
    return { success: true };
  } catch (err) {
    console.error('authService.updateUser error:', err);
    return { success: false };
  }
}

export async function deleteUser(userId, actor) {
  try {
    // Read employee to get assigned branches before deleting
    const currentSnap = await get(ref(db, tenantPath(`employees/${userId}`)));
    const current = currentSnap.val();
    const branches = current?.branches || {};

    // Remove role cache entries from all assigned branches
    const cacheUpdates = {};
    for (const branchId of Object.keys(branches)) {
      cacheUpdates[`branches/${branchId}/_role_cache/${userId}`] = null; // delete
    }
    if (Object.keys(cacheUpdates).length > 0) {
      await update(ref(db), cacheUpdates);
    }

    await remove(ref(db, tenantPath(`employees/${userId}`)));
    auditLog('user.deleted', { userId }, actor || 'system');
    return { success: true };
  } catch (err) {
    console.error('authService.deleteUser error:', err);
    return { success: false };
  }
}

async function seedDefaultRoles() {
  try {
    const defaults = getDefaultRoles();
    if (Object.keys(defaults).length === 0) return;
    const rolesRef = tenantRef('roles');
    const snap = await get(rolesRef);
    if (!snap.val()) {
      await set(rolesRef, defaults);
    }
  } catch (err) {
    console.warn('authService.seedDefaultRoles error:', err);
  }
}

export async function getRoles() {
  try {
    const snap = await get(tenantRef('roles'));
    const data = snap.val();
    if (!data) {
      await seedDefaultRoles();
      return getDefaultRoles();
    }
    return data;
  } catch (err) {
    console.warn('authService.getRoles error:', err);
    return getDefaultRoles();
  }
}

export async function saveRole(roleKey, data) {
  try {
    const roleRef = ref(db, tenantPath(`roles/${roleKey}`));
    await set(roleRef, {
      name: data.name || roleKey,
      key: roleKey,
      permissions: data.permissions || {},
    });
    return { success: true };
  } catch (err) {
    console.error('authService.saveRole error:', err);
    return { success: false };
  }
}

export function subscribeRoles(callback) {
  const rolesRef = tenantRef('roles');
  seedDefaultRoles();
  return onValue(rolesRef, (snap) => {
    const data = snap.val();
    callback(data || getDefaultRoles());
  });
}

export { hasPermission };
