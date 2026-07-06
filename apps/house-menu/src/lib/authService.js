import { ref, get, set, push, update, remove, onValue } from 'firebase/database';
import { realtimeDB as db, auth } from '@house/db';
import { getDefaultRoles, hasPermission } from './permissions';
import { getDefaultUsers } from './roleRegistry';
import { tenantRef, tenantPath, getTenantId, setTenantId } from './tenantService';
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
    status: profile.status || record.status || null,
    statusEnd: profile.statusEnd || record.statusEnd || null,
    createdAt: profile.createdAt || record.createdAt || null,
    updatedAt: profile.updatedAt || record.updatedAt || null,
    firebaseUid: record.firebaseUid || null,
    branches: record.branches || { monteverde: true },
    homeBranch: record.homeBranch || null,
    profile,
  };
}

// Helper to find a user by email in a specific tenant
async function findUserByEmailInTenant(email, tenantId) {
  try {
    const employeesRef = ref(db, `tenants/${tenantId}/employees`);
    const snapshot = await get(employeesRef);
    const allEmployees = snapshot.val();
    if (!allEmployees) return null;
    for (const [id, emp] of Object.entries(allEmployees)) {
      const normalised = normaliseEmployee(id, emp);
      if (normalised.email === email && normalised.active !== false && normalised.status !== 'suspended' && normalised.status !== 'vacation') {
        return normalised;
      }
    }
    return null;
  } catch (err) {
    console.warn(`authService.findUserByEmailInTenant error for ${tenantId}:`, err);
    return null;
  }
}

export async function findUserByFirebaseUid(firebaseUid) {
  if (!firebaseUid) return null;
  try {
    const userSnap = await get(ref(db, `global/users/${firebaseUid}`));
    const globalUser = userSnap.val();
    if (!globalUser || !globalUser.memberships) {
      return findUserByFirebaseUidInTenant(firebaseUid, 'default');
    }
    const activeMemberships = Object.keys(globalUser.memberships).filter(tid => globalUser.memberships[tid].active !== false);
    if (activeMemberships.length === 0) return null;
    const tenantId = getTenantId() || activeMemberships[0];
    const empSnap = await get(ref(db, `tenants/${tenantId}/employees/${firebaseUid}`));
    const empRecord = empSnap.val();
    if (empRecord) {
      return normaliseEmployee(firebaseUid, empRecord);
    }
    return null;
  } catch (err) {
    console.warn('authService.findUserByFirebaseUid error:', err);
    return null;
  }
}

async function findUserByFirebaseUidInTenant(firebaseUid, tenantId) {
  try {
    const empRef = ref(db, `tenants/${tenantId}/employees/${firebaseUid}`);
    const snapshot = await get(empRef);
    const data = snapshot.val();
    if (data) {
      const normalised = normaliseEmployee(firebaseUid, data);
      if (normalised.active !== false && normalised.status !== 'suspended' && normalised.status !== 'vacation') return normalised;
    }
    const allRef = ref(db, `tenants/${tenantId}/employees`);
    const allSnap = await get(allRef);
    const all = allSnap.val();
    if (!all) return null;
    for (const [id, emp] of Object.entries(all)) {
      const n = normaliseEmployee(id, emp);
      if (n.firebaseUid === firebaseUid && n.active !== false && n.status !== 'suspended' && n.status !== 'vacation') {
        return n;
      }
    }
    return null;
  } catch (err) {
    console.warn('authService.findUserByFirebaseUidInTenant error:', err);
    return null;
  }
}

async function findUserByEmailInBranches(email) {
  try {
    const branchesSnap = await get(ref(db, 'branches'));
    const branches = branchesSnap.val();
    if (!branches) return null;
    for (const [branchId, branchData] of Object.entries(branches)) {
      const employees = branchData?.employees;
      if (!employees) continue;
      for (const [empId, emp] of Object.entries(employees)) {
        const norm = normaliseEmployee(empId, emp);
        if (norm.email?.toLowerCase() === email.toLowerCase() && norm.active !== false) {
          return {
            id: empId,
            email: norm.email,
            name: norm.name,
            role: norm.role,
            tenantId: getTenantId(),
          };
        }
      }
    }
    return null;
  } catch (err) {
    console.warn('authService.findUserByEmailInBranches error:', err);
    return null;
  }
}

// Helper to migrate an existing tenant employee to the global indexes
async function migrateUserToGlobal(uid, email, name, tenantId, role) {
  const encodedEmail = email.replace(/\./g, ',');
  const now = nowISO();
  const payload = {
    [`global/emails_to_uid/${encodedEmail}`]: uid,
    [`global/users/${uid}/profile`]: {
      name,
      email,
      updatedAt: now,
    },
    [`global/users/${uid}/memberships/${tenantId}`]: {
      role,
      joinedAt: now,
      active: true,
    },
  };
  try {
    await update(ref(db), payload);
    console.log(`Successfully migrated user ${email} (${uid}) to global indexes.`);
  } catch (err) {
    console.warn(`Failed to migrate user ${email} to global:`, err);
  }
}

// Helper to fetch metadata for a list of memberships
export async function fetchUserWorkspaces(memberships) {
  if (!memberships) return [];
  const workspaces = [];
  for (const tenantId of Object.keys(memberships)) {
    try {
      const metaSnap = await get(ref(db, `tenants/${tenantId}/_meta`));
      const meta = metaSnap.val() || {};
      workspaces.push({
        id: tenantId,
        name: meta.name || tenantId,
        description: meta.description || '',
        role: memberships[tenantId].role,
        defaultBranch: meta.defaultBranch || null,
      });
    } catch (err) {
      console.warn(`Error fetching meta for tenant ${tenantId}:`, err);
      workspaces.push({
        id: tenantId,
        name: tenantId,
        role: memberships[tenantId].role,
      });
    }
  }
  return workspaces;
}

export async function verifyPin(email, pin, selectedTenantId = null) {
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
          branchIds: { monteverde: true },
        },
      };
    }
  }

  await ensureFirebaseReadAccess();

  const encodedEmail = email.replace(/\./g, ',');
  
  // 1. Try to find the global mapping
  const emailMapSnap = await get(ref(db, `global/emails_to_uid/${encodedEmail}`));
  let uid = emailMapSnap.val();
  let memberships = null;
  let globalUser = null;

  if (!uid) {
    // Fallback/Migration: search in 'default' tenant
    const fallbackUser = await findUserByEmailInTenant(email, 'default');
    if (fallbackUser) {
      uid = fallbackUser.id;
      await migrateUserToGlobal(uid, fallbackUser.email, fallbackUser.name, 'default', fallbackUser.role);
      memberships = { default: { role: fallbackUser.role, active: true } };
    } else {
      // Fallback 2: search branch employees (when createUser failed during createEmployee)
      const branchFallback = await findUserByEmailInBranches(email);
      if (branchFallback) {
        uid = branchFallback.id;
        await migrateUserToGlobal(uid, branchFallback.email, branchFallback.name, branchFallback.tenantId || 'default', branchFallback.role);
        memberships = { [branchFallback.tenantId || 'default']: { role: branchFallback.role, active: true } };
      } else {
        return { success: false, error: 'Credenciales incorrectas' };
      }
    }
  } else {
    // Read global profile
    const userSnap = await get(ref(db, `global/users/${uid}`));
    globalUser = userSnap.val();
    if (!globalUser || !globalUser.memberships) {
      return { success: false, error: 'Usuario sin espacios de trabajo configurados' };
    }
    memberships = globalUser.memberships;
  }

  const activeMemberships = Object.keys(memberships).filter(tid => memberships[tid].active !== false);
  if (activeMemberships.length === 0) {
    return { success: false, error: 'Tu cuenta no está activa en ningún espacio de trabajo' };
  }

  // Determine which tenant to verify PIN against
  let tenantId = selectedTenantId;
  if (!tenantId) {
    if (activeMemberships.length === 1) {
      tenantId = activeMemberships[0];
    } else {
      // Requires workspace selection
      const workspaces = await fetchUserWorkspaces(memberships);
      return {
        success: true,
        requiresSelection: true,
        workspaces,
        uid,
        email,
      };
    }
  }

  // Verify membership in the selected tenant
  if (!memberships[tenantId] || memberships[tenantId].active === false) {
    return { success: false, error: 'No tienes acceso a este espacio de trabajo' };
  }

  // Set the tenant active path
  setTenantId(tenantId);

  // Fetch the employee record from the tenant
  const empSnap = await get(ref(db, `tenants/${tenantId}/employees/${uid}`));
  const empRecord = empSnap.val();
  if (!empRecord) {
    return { success: false, error: 'El usuario no existe en este espacio de trabajo' };
  }

  const found = normaliseEmployee(uid, empRecord);
  const hashToCheck = found.pinHash || found.profile?.pinHash;
  const plainToCheck = found.pin || found.profile?.pin;

  let valid = false;
  if (hashToCheck) {
    valid = await verifyPinHash(pin, hashToCheck);
  } else if (plainToCheck) {
    valid = plainToCheck === pin;
    if (valid) {
      const newHash = await hashPin(pin);
      try {
        await update(ref(db, `tenants/${tenantId}/employees/${uid}`), {
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
      branchIds: found.branches || { monteverde: true },
    },
  };
}

export async function ensureFirebaseUser(firebaseUser, selectedTenantId = null) {
  const uid = firebaseUser.uid;
  const encodedEmail = firebaseUser.email.replace(/\./g, ',');

  // 1. Check global user profile
  const userSnap = await get(ref(db, `global/users/${uid}`));
  let globalUser = userSnap.val();
  let memberships = null;

  if (!globalUser) {
    // 2. Check if we need to link/merge a PIN-login user (push ID) to this Firebase UID
    const emailMapSnap = await get(ref(db, `global/emails_to_uid/${encodedEmail}`));
    const oldUid = emailMapSnap.val();

    if (oldUid && oldUid !== uid) {
      // Perform identity merging/linking!
      const oldUserSnap = await get(ref(db, `global/users/${oldUid}`));
      const oldUser = oldUserSnap.val();
      if (oldUser) {
        const now = nowISO();
        const mergePayload = {};
        
        // Copy global user to the new UID
        mergePayload[`global/users/${uid}`] = {
          profile: {
            name: firebaseUser.displayName || oldUser.profile?.name || '',
            email: firebaseUser.email,
            updatedAt: now,
          },
          memberships: oldUser.memberships,
        };
        // Delete old global user and update email map
        mergePayload[`global/users/${oldUid}`] = null;
        mergePayload[`global/emails_to_uid/${encodedEmail}`] = uid;

        // Migrate records in all associated tenants
        for (const tenantId of Object.keys(oldUser.memberships || {})) {
          const empSnap = await get(ref(db, `tenants/${tenantId}/employees/${oldUid}`));
          const empData = empSnap.val();
          if (empData) {
            empData.firebaseUid = uid;
            if (!empData.profile) empData.profile = {};
            empData.profile.name = firebaseUser.displayName || empData.profile.name || '';
            empData.profile.updatedAt = now;

            mergePayload[`tenants/${tenantId}/employees/${uid}`] = empData;
            mergePayload[`tenants/${tenantId}/employees/${oldUid}`] = null;

            // Update role cache for assigned branches
            const branches = empData.branches || {};
            for (const branchId of Object.keys(branches)) {
              mergePayload[`branches/${branchId}/_role_cache/${oldUid}`] = null;
              mergePayload[`branches/${branchId}/_role_cache/${uid}`] = empData.role;
            }
          }
        }

        await update(ref(db), mergePayload);
        console.log(`Successfully merged PIN user ${oldUid} to Firebase UID ${uid}`);
        globalUser = { memberships: oldUser.memberships };
      }
    } else {
      // 3. Check fallback/migration in 'default' tenant
      const fallbackUser = await findUserByEmailInTenant(firebaseUser.email, 'default');
      if (fallbackUser) {
        // Migrate to global indexes using the actual Firebase UID
        await migrateUserToGlobal(uid, firebaseUser.email, firebaseUser.displayName || fallbackUser.name, 'default', fallbackUser.role);
        
        // Also update the employee record in 'default' tenant to use the Firebase UID
        const now = nowISO();
        const fallbackEmpSnap = await get(ref(db, `tenants/default/employees/${fallbackUser.id}`));
        const empData = fallbackEmpSnap.val();
        if (empData) {
          empData.firebaseUid = uid;
          await update(ref(db), {
            [`tenants/default/employees/${uid}`]: empData,
            [`tenants/default/employees/${fallbackUser.id}`]: null,
            [`branches/monteverde/_role_cache/${fallbackUser.id}`]: null,
            [`branches/monteverde/_role_cache/${uid}`]: empData.role,
          });
        }
        
        globalUser = { memberships: { default: { role: fallbackUser.role, active: true } } };
      }
    }
  }

  if (!globalUser || !globalUser.memberships) {
    return {
      success: false,
      error: 'No tenés acceso al sistema. Contactá al administrador para que te registre.',
    };
  }

  memberships = globalUser.memberships;
  const activeMemberships = Object.keys(memberships).filter(tid => memberships[tid].active !== false);
  if (activeMemberships.length === 0) {
    return { success: false, error: 'Tu cuenta no está activa en ningún espacio de trabajo' };
  }

  // Resolve active tenant
  let tenantId = selectedTenantId;
  if (!tenantId) {
    if (activeMemberships.length === 1) {
      tenantId = activeMemberships[0];
    } else {
      // Requires workspace selection
      const workspaces = await fetchUserWorkspaces(memberships);
      return {
        success: true,
        requiresSelection: true,
        workspaces,
        firebaseUser,
      };
    }
  }

  if (!memberships[tenantId] || memberships[tenantId].active === false) {
    return { success: false, error: 'No tienes acceso a este espacio de trabajo' };
  }

  setTenantId(tenantId);

  // Read the employee record in the active tenant
  const empSnap = await get(ref(db, `tenants/${tenantId}/employees/${uid}`));
  let empRecord = empSnap.val();
  
  if (!empRecord) {
    // If membership exists globally but not in tenant (e.g. out of sync), recreate it
    console.warn(`Employee record not found in tenant ${tenantId} for UID ${uid}. Recreating.`);
    const now = nowISO();
    empRecord = {
      profile: {
        name: firebaseUser.displayName || globalUser.profile?.name || 'Empleado',
        email: firebaseUser.email,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      role: memberships[tenantId].role || 'kitchen',
      branches: { monteverde: true },
      homeBranch: 'monteverde',
      firebaseUid: uid,
    };
    await set(ref(db, `tenants/${tenantId}/employees/${uid}`), empRecord);
  }

  const existing = normaliseEmployee(uid, empRecord);
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
      branchIds: existing.branches || { monteverde: true },
    },
  };
}

export async function createSession(user) {
  // Generate a cryptographically secure token
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

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
      // Sync _role_cache for the current Firebase Auth UID so branch-level
      // rules (which check _role_cache/{auth.uid}) grant access immediately
      const uid = auth.currentUser.uid;
      const branchIds = user.branchIds || { monteverde: true };
      const cacheUpdates = {};
      for (const bid of Object.keys(branchIds)) {
        cacheUpdates[`branches/${bid}/_role_cache/${uid}`] = user.role;
      }
      if (Object.keys(cacheUpdates).length > 0) {
        await update(ref(db), cacheUpdates);
      }
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
      branches: branchIds || { monteverde: true },
      homeBranch: branchIds ? Object.keys(branchIds)[0] : null,
      firebaseUid: null,
    };
    await set(newRef, employee);

    // Sync role cache for all assigned branches
    const targetBranches = branchIds || { monteverde: true };
    const cacheUpdates = {};
    for (const branchId of Object.keys(targetBranches)) {
      cacheUpdates[`branches/${branchId}/_role_cache/${newRef.key}`] = role;
    }
    if (Object.keys(cacheUpdates).length > 0) {
      await update(ref(db), cacheUpdates);
    }

    // Sync to global index for multi-tenancy
    const encodedEmail = email.replace(/\./g, ',');
    const tenantId = getTenantId();
    const globalPayload = {
      [`global/emails_to_uid/${encodedEmail}`]: newRef.key,
      [`global/users/${newRef.key}/profile`]: {
        name,
        email,
        updatedAt: nowISO(),
      },
      [`global/users/${newRef.key}/memberships/${tenantId}`]: {
        role,
        joinedAt: nowISO(),
        active: true,
      },
    };
    await update(ref(db), globalPayload);

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
    const oldBranches = current?.branches || { monteverde: true };
    const oldRole = current?.role || 'kitchen';
    const newBranches = data.branchIds || oldBranches;
    const newRole = data.role || oldRole;

    // Build employee updates
    const updates = {};
    if (data.name !== undefined) updates['profile/name'] = data.name;
    if (data.email !== undefined) updates['profile/email'] = data.email;
    if (data.status) {
      updates.status = data.status;
    }
    if (data.statusEnd) {
      updates.statusEnd = data.statusEnd;
    }
    if (data.active !== undefined) {
      updates['profile/active'] = data.active;
    } else if (data.status) {
      // Derive active from status for legacy auth checks (findUserByEmail, findUserByFirebaseUid)
      updates['profile/active'] = data.status !== 'inactive';
    }
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

    // Sync to global index
    const tenantId = getTenantId();
    const globalUpdates = {};
    if (data.name !== undefined) globalUpdates[`global/users/${userId}/profile/name`] = data.name;
    if (data.email !== undefined) {
      const oldEmailEncoded = current?.profile?.email?.replace(/\./g, ',');
      const newEmailEncoded = data.email.replace(/\./g, ',');
      if (oldEmailEncoded && oldEmailEncoded !== newEmailEncoded) {
        globalUpdates[`global/emails_to_uid/${oldEmailEncoded}`] = null;
        globalUpdates[`global/emails_to_uid/${newEmailEncoded}`] = userId;
      }
      globalUpdates[`global/users/${userId}/profile/email`] = data.email;
    }
    if (data.role !== undefined) {
      globalUpdates[`global/users/${userId}/memberships/${tenantId}/role`] = data.role;
    }
    globalUpdates[`global/users/${userId}/profile/updatedAt`] = nowISO();
    
    if (Object.keys(globalUpdates).length > 0) {
      await update(ref(db), globalUpdates);
    }

    auditLog('user.updated', { userId, ...data }, actor || 'system');
    return { success: true };
  } catch (err) {
    console.error('authService.updateUser error:', err);
    return { success: false };
  }
}

export async function deleteUser(userId, actor, actorRole) {
  try {
    // Read employee to get assigned branches + role before deleting
    const currentSnap = await get(ref(db, tenantPath(`employees/${userId}`)));
    const current = currentSnap.val();

    // ── Protección 1: no eliminar admin/superadmin sin ser superadmin ──
    const targetRole = current?.role;
    if (targetRole === 'admin' || targetRole === 'superadmin') {
      if (actorRole !== 'superadmin') {
        console.error(`deleteUser: rechazado — ${actor} intentó eliminar ${targetRole} ${userId}`);
        return { success: false, error: `No podés eliminar un usuario con rol ${targetRole}. Solo un superadmin puede hacerlo.` };
      }
      // ── Protección 2: no eliminar al ÚLTIMO superadmin ──
      if (targetRole === 'superadmin') {
        const allSnap = await get(ref(db, tenantPath('employees')));
        const all = allSnap.val();
        const superadminCount = Object.values(all || {}).filter(e => e?.role === 'superadmin').length;
        if (superadminCount <= 1) {
          console.error(`deleteUser: rechazado — último superadmin ${userId}`);
          return { success: false, error: 'No podés eliminar al último superadmin del sistema.' };
        }
      }
    }

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

    // Sync to global index
    const tenantId = getTenantId();
    const globalUpdates = {};
    globalUpdates[`global/users/${userId}/memberships/${tenantId}`] = null;
    
    // Check if they have any other memberships left
    const globalUserSnap = await get(ref(db, `global/users/${userId}`));
    const globalUser = globalUserSnap.val();
    const remainingMemberships = Object.keys(globalUser?.memberships || {}).filter(t => t !== tenantId);
    
    if (remainingMemberships.length === 0) {
      // No memberships left, delete the entire global user and email mapping
      globalUpdates[`global/users/${userId}`] = null;
      if (globalUser?.profile?.email) {
        const encodedEmail = globalUser.profile.email.replace(/\./g, ',');
        globalUpdates[`global/emails_to_uid/${encodedEmail}`] = null;
      }
    }
    if (Object.keys(globalUpdates).length > 0) {
      await update(ref(db), globalUpdates);
    }

    auditLog('user.deleted', { userId, targetRole }, actor || 'system');
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

export async function switchWorkspaceSession(session, tenantId) {
  const uid = session.firebaseUid || session.userId;
  
  // Verify membership in the new tenant
  const userSnap = await get(ref(db, `global/users/${uid}`));
  const globalUser = userSnap.val();
  if (!globalUser || !globalUser.memberships || !globalUser.memberships[tenantId] || globalUser.memberships[tenantId].active === false) {
    return { success: false, error: 'No tienes acceso a este espacio de trabajo' };
  }
  
  // Set the tenant
  setTenantId(tenantId);
  
  // Fetch employee record
  const empSnap = await get(ref(db, `tenants/${tenantId}/employees/${uid}`));
  const empRecord = empSnap.val();
  if (!empRecord) {
    return { success: false, error: 'El usuario no existe en este espacio de trabajo' };
  }
  
  const found = normaliseEmployee(uid, empRecord);
  const roles = await getRoles();
  const roleDef = roles[found.role] || getDefaultRoles()[found.role];
  
  const user = {
    id: found.id,
    email: found.email,
    name: found.name,
    role: found.role,
    permissions: roleDef?.permissions || {},
    branchIds: found.branches || { monteverde: true },
  };
  
  const newSessionData = await createSession({
    ...user,
    firebaseUid: session.firebaseUid || null,
  });
  
  return { success: true, session: newSessionData };
}

export function subscribeUserWorkspaces(uid, callback) {
  const userRef = ref(db, `global/users/${uid}/memberships`);
  return onValue(userRef, async (snap) => {
    const memberships = snap.val();
    if (!memberships) {
      callback([]);
      return;
    }
    const list = await fetchUserWorkspaces(memberships);
    callback(list);
  });
}

export { hasPermission };
