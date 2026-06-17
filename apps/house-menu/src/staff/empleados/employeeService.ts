/**
 * Employee Service — Portal Empleados data layer for house-menu.
 *
 * Reads/writes from tenants/{tenantId}/employees/{uid}
 * using the unified auth model (keyed by Firebase UID).
 */

import { ref, get, set, update, push, onValue, runTransaction } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { tenantRef, tenantPath } from '../../lib/tenantService';

// ── Helpers ────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Employee ───────────────────────────────────────────

export async function getEmployee(uid: string) {
  if (!uid) return null;
  const snap = await get(tenantRef(`employees/${uid}`));
  if (!snap.exists()) return null;
  return { uid, ...snap.val() };
}

export function subscribeEmployee(uid: string, callback: (data: Record<string, unknown> | null) => void) {
  if (!uid) { callback(null); return () => {}; }
  const unsub = onValue(tenantRef(`employees/${uid}`), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ uid, ...snap.val() });
  });
  return unsub;
}

// ── Attendance ─────────────────────────────────────────

export async function clockIn(uid: string) {
  const date = todayStr();
  const now = Date.now();
  const recordRef = ref(db, tenantPath(`employees/${uid}/attendance/${date}`));

  const result = await runTransaction(recordRef, (current) => {
    if (current === null) {
      return { clockIn: now, clockOut: null, date };
    }
    // Already clocked in — no-op
    return current;
  });

  return result.snapshot.val();
}

export async function clockOut(uid: string) {
  const date = todayStr();
  const now = Date.now();
  await update(ref(db, tenantPath(`employees/${uid}/attendance/${date}`)), { clockOut: now });
  return { date, clockOut: now };
}

export function subscribeAttendance(uid: string, callback: (data: Record<string, unknown> | null) => void) {
  if (!uid) { callback(null); return () => {}; }
  const date = todayStr();
  const unsub = onValue(ref(db, tenantPath(`employees/${uid}/attendance/${date}`)), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ date, ...snap.val() });
  });
  return unsub;
}

export function subscribeAttendanceHistory(uid: string, callback: (records: Record<string, unknown>[]) => void) {
  if (!uid) { callback([]); return () => {}; }
  const unsub = onValue(tenantRef(`employees/${uid}/attendance`), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const records = Object.entries(snap.val()).map(([date, data]) => ({ date, ...(data as object) }));
    records.sort((a, b) => (b.date as string).localeCompare(a.date as string));
    callback(records);
  });
  return unsub;
}

// ── Schedule ───────────────────────────────────────────

export async function getSchedule(uid: string) {
  if (!uid) return null;
  const snap = await get(tenantRef(`employees/${uid}/schedule`));
  if (!snap.exists()) return null;
  return snap.val();
}

// ── Goals / Tasks ──────────────────────────────────────

export function subscribeGoals(uid: string, callback: (goals: Record<string, unknown>[]) => void) {
  if (!uid) { callback([]); return () => {}; }
  const unsub = onValue(tenantRef(`employees/${uid}/goals`), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.entries(snap.val()).map(([id, g]) => ({ id, ...(g as object) })));
  });
  return unsub;
}
