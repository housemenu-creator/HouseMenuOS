import { ref, get, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { verifyPinByIndex } from './authService';
import { tenantPath } from './tenantService';

// ── Employee lookup ──
//
// UNIFIED: all data lives under tenants/{tenant}/employees/{uid}.
// branchId is kept in signatures for caller compatibility and ignored.
// The tenant employee key IS the portal uid (createUser keys by pushId with
// firebaseUid null; applications key by firebaseUid — session.id covers both).

/**
 * Portal login by PIN ONLY. Authenticates via the O(1) tenant index
 * (verifyPinByIndex: pinHash PBKDF2, no plaintext scan). Returns the tenant
 * employee record directly — no branch resolution needed.
 */
export async function loginPortalByPin(pin, branchId, tenantId = 'default', emailToDisambiguate = null) {
  if (!pin || !branchId) return null;
  const result = await verifyPinByIndex(pin, tenantId, emailToDisambiguate);
  if (!result.success) return null;
  const uid = result.user.id;
  return { id: uid, ...result.user, userId: uid };
}

export function subscribeEmployee(employeeId, branchId, callback) {
  const empRef = ref(db, tenantPath(`employees/${employeeId}`));
  return onValue(empRef, (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ id: employeeId, ...snap.val() });
  });
}

// ── Schedule ──

export async function getSchedule(employeeId, branchId) {
  const snap = await get(ref(db, tenantPath(`employees/${employeeId}/schedule`)));
  return snap.exists() ? snap.val() : null;
}

// ── Goals / Tasks ──

export function subscribeGoals(employeeId, branchId, callback) {
  const goalsRef = ref(db, tenantPath(`employees/${employeeId}/goals`));
  return onValue(goalsRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.entries(snap.val()).map(([id, g]) => ({ id, ...g })));
  });
}