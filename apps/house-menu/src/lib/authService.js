import { ref, get, set, push, update, remove, onValue } from 'firebase/database';
import { realtimeDB as db, auth } from '@house/db';
import { getDefaultRoles, hasPermission } from './permissions';
import { getDefaultUsers } from './roleRegistry';
import { tenantRef, tenantPath } from './tenantService';
import { nowISO } from './format';
import { auditLog } from './auditService';
import { hashPin, verifyPinHash } from './crypto';

function genId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Fallback users when RTDB is unreachable (no Firebase Auth session yet) */
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

export async function verifyPin(email, pin) {
  // Default users first — always work for known email+pin combos
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
          permissions: roleDef.permissions,
          membershipId: du.id + '-mem',
          branchIds: { hq: true },
        },
      };
    }
  }

  await ensureFirebaseReadAccess();
  const found = await findUserByEmail(email);
  if (found && (found.pinHash || found.pin)) {
    let valid = false;
    if (found.pinHash) {
      valid = await verifyPinHash(pin, found.pinHash);
    } else if (found.pin) {
      // Plaintext PIN — migrate to hash on successful login
      valid = found.pin === pin;
      if (valid) {
        const newHash = await hashPin(pin);
        try {
          await update(ref(db, tenantPath(`users/${found.id}`)), { pinHash: newHash, pin: null });
        } catch (err) {
          console.warn('authService: no se pudo migrar PIN a hash:', err);
        }
      }
    }
    if (!valid) {
      return { success: false, error: 'PIN incorrecto' };
    }
    const membership = await getUserActiveMembership(found.id);
    if (!membership) {
      return { success: false, error: 'Usuario sin asignación a una sucursal' };
    }
    const roles = await getRoles();
    const roleDef = roles[membership.roleId] || getDefaultRoles()[membership.roleId];
    return {
      success: true,
      user: {
        id: found.id,
        email: found.email,
        name: found.name,
        role: membership.roleId,
        permissions: roleDef?.permissions || {},
        membershipId: membership.id,
        branchIds: membership.branchIds || {},
      },
    };
  }

  return { success: false, error: 'Credenciales incorrectas' };
}

async function findUserByEmail(email) {
  try {
    const usersRef = tenantRef('users');
    const snapshot = await get(usersRef);
    const allUsers = snapshot.val();
    if (!allUsers) return null;
    const entries = Object.entries(allUsers);
    for (const [id, u] of entries) {
      if (u.email === email && u.active !== false) {
        return { id, ...u };
      }
    }
    return null;
  } catch (err) {
    console.warn('authService.findUserByEmail error:', err);
    return null;
  }
}

export async function findUserByFirebaseUid(firebaseUid) {
  try {
    const usersRef = tenantRef('users');
    const snapshot = await get(usersRef);
    const allUsers = snapshot.val();
    if (!allUsers) return null;
    const entries = Object.entries(allUsers);
    for (const [id, u] of entries) {
      if (u.firebaseUid === firebaseUid && u.active !== false) {
        return { id, ...u };
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
    const membership = await getUserActiveMembership(existing.id);
    if (!membership) {
      return { success: false, error: 'Usuario sin asignación a una sucursal' };
    }
    const roles = await getRoles();
    const roleDef = roles[membership.roleId] || getDefaultRoles()[membership.roleId];
    return {
      success: true,
      user: {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: membership.roleId,
        permissions: roleDef?.permissions || {},
        membershipId: membership.id,
        branchIds: membership.branchIds || {},
      },
    };
  }

  // Not found by firebaseUid — search by email to link admin-created users
  const existingByEmail = await findUserByEmail(firebaseUser.email);
  if (existingByEmail) {
    try {
      await update(ref(db, tenantPath(`users/${existingByEmail.id}`)), {
        firebaseUid: firebaseUser.uid,
        name: existingByEmail.name || firebaseUser.displayName,
      });
    } catch (err) {
      console.warn('authService.ensureFirebaseUser: error al vincular firebaseUid:', err);
    }
    const membership = await getUserActiveMembership(existingByEmail.id);
    if (!membership) {
      return { success: false, error: 'Usuario sin asignación a una sucursal' };
    }
    const roles = await getRoles();
    const roleDef = roles[membership.roleId] || getDefaultRoles()[membership.roleId];
    return {
      success: true,
      user: {
        id: existingByEmail.id,
        email: existingByEmail.email,
        name: existingByEmail.name,
        role: membership.roleId,
        permissions: roleDef?.permissions || {},
        membershipId: membership.id,
        branchIds: membership.branchIds || {},
      },
    };
  }

  const newUser = {
    email: firebaseUser.email,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
    firebaseUid: firebaseUser.uid,
    role: defaultRole,
    active: true,
    createdAt: nowISO(),
  };

  try {
    const usersRef = tenantRef('users');
    const newRef = push(usersRef);
    await set(newRef, newUser);
    const membershipResult = await createMembership(newRef.key, defaultRole, branchIds);
    if (!membershipResult.success) {
      return { success: false, error: 'Error al crear membresía' };
    }
    return {
      success: true,
      user: {
        id: newRef.key,
        email: newUser.email,
        name: newUser.name,
        role: defaultRole,
        permissions: getDefaultRoles()[defaultRole]?.permissions || {},
        membershipId: membershipResult.membershipId,
        branchIds,
      },
    };
  } catch (err) {
    console.error('authService.ensureFirebaseUser error:', err);
    return { success: false, error: 'Error al crear usuario' };
  }
}

async function getUserActiveMembership(userId) {
  try {
    const membershipsRef = tenantRef('memberships');
    const snapshot = await get(membershipsRef);
    const data = snapshot.val();
    if (!data) return null;
    const entries = Object.entries(data);
    for (const [id, m] of entries) {
      if (m.userId === userId && m.active !== false) {
        return { id, ...m };
      }
    }
    return null;
  } catch (err) {
    console.warn('authService.getUserActiveMembership error:', err);
    return null;
  }
}

export async function createSession(user) {
  const token = genId() + genId();
  const sessionData = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
    membershipId: user.membershipId,
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
  const usersRef = tenantRef('users');
  return onValue(usersRef, (snap) => {
    const data = snap.val();
    if (!data) {
      callback(DEFAULT_USERS);
      return;
    }
    const list = Object.entries(data).map(([id, u]) => ({ id, ...u }));
    callback(list);
  });
}

export async function createUser({ email, name, role, pin, branchIds, actor }) {
  try {
    const usersRef = tenantRef('users');
    const newRef = push(usersRef);
    const pinHash = await hashPin(pin);
    await set(newRef, { email, name, pinHash, role, active: true, firebaseUid: null, createdAt: nowISO() });
    await createMembership(newRef.key, role, branchIds);
    auditLog('user.created', { userId: newRef.key, email, name, role, branchIds }, actor || 'system');
    return { success: true, userId: newRef.key };
  } catch (err) {
    console.error('authService.createUser error:', err);
    return { success: false, userId: null };
  }
}

async function createMembership(userId, role, branchIds = { hq: true }) {
  try {
    const membershipsRef = tenantRef('memberships');
    const newRef = push(membershipsRef);
    await set(newRef, { userId, roleId: role, branchIds, active: true });
    return { success: true, membershipId: newRef.key };
  } catch (err) {
    console.warn('authService.createMembership error:', err);
    return { success: false, membershipId: null };
  }
}

export async function updateUser(userId, data, actor) {
  try {
    const updates = { ...data };
    if (updates.pin) {
      updates.pinHash = await hashPin(updates.pin);
      delete updates.pin;
    }
    await update(ref(db, tenantPath(`users/${userId}`)), updates);

    if (updates.role) {
      const membership = await getUserActiveMembership(userId);
      if (membership) {
        await update(ref(db, tenantPath(`memberships/${membership.id}`)), { roleId: updates.role });
      }
    }
    if (updates.branchIds) {
      const membership = await getUserActiveMembership(userId);
      if (membership) {
        await update(ref(db, tenantPath(`memberships/${membership.id}`)), { branchIds: updates.branchIds });
      }
    }

    auditLog('user.updated', { userId, ...updates }, actor || 'system');
    return { success: true };
  } catch (err) {
    console.error('authService.updateUser error:', err);
    return { success: false };
  }
}

export async function deleteUser(userId, actor) {
  try {
    await remove(ref(db, tenantPath(`users/${userId}`)));
    const membershipsRef = tenantRef('memberships');
    const snap = await get(membershipsRef);
    if (snap.val()) {
      const entries = Object.entries(snap.val());
      for (const [id, m] of entries) {
        if (m.userId === userId) {
          await remove(ref(db, tenantPath(`memberships/${id}`)));
        }
      }
    }
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
