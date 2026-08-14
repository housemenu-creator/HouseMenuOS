/**
 * Employee Service — Portal Empleados data layer for house-menu.
 *
 * Reads/writes from tenants/{tenantId}/employees/{uid}
 * using the unified auth model (keyed by tenant employee key).
 *
 * Extended with:
 *  - Shift state machine (pending→active→completed→verified)
 *  - Area/station assignment per shift
 *  - Checklist items (inicio/cierre) with snapshot from area template
 *  - Timeline of events per shift
 *  - Incident reporting
 *  - Handover notes
 *
 * UNIFIED: source of truth is tenants/{tenantT}/employees/{uid}.
 * branchId is kept in the signatures only for backward compatibility
 * with callers — data no longer lives under branches/.
 * ponytail: admin still writes goals to branches/{b}/employees/{pushId}/goals;
 * sync to tenant (by userId) when goals are migrated.
 */

import { ref, get, set, update, push, onValue, runTransaction } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { tenantPath } from '../../lib/tenantService';

// ── Helpers ────────────────────────────────────────────

function employeePath(_branchId: string, uid: string) {
  return tenantPath(`employees/${uid}`);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Employee ───────────────────────────────────────────

export async function getEmployee(branchId: string, uid: string) {
  if (!uid) return null;
  const snap = await get(ref(db, employeePath(branchId, uid)));
  if (!snap.exists()) return null;
  return { uid, ...snap.val() };
}

export function subscribeEmployee(branchId: string, uid: string, callback: (data: any) => void) {
  if (!uid) { callback(null); return () => {}; }
  const unsub = onValue(ref(db, employeePath(branchId, uid)), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ uid, ...snap.val() });
  });
  return unsub;
}

// ── Shift (attendance extended v2) ─────────────────────
//
// Data shape:
//   branches/{branchId}/employees/{uid}/attendance/{date}/
//     state: "active" | "completed" | "verified"
//     clockIn: timestamp
//     clockOut: timestamp | null
//     area: "cocina" | "salon" | ...
//     station: "parrilla" | "mesas-1-4" | ...
//     areaSnapshot: { name, stations, checklists }   ← immutable copy of the template at clockIn
//     checklists:
//       inicio: { [itemId]: { label, done, at } }
//       cierre: { [itemId]: { label, done, at } }
//     timeline: [
//       { at, type: "clock_in" | "checklist_item" | "pause" | "clock_out" | "incident" | "verify", data? }
//     ]
//     handover: { notes, receivedBy: null | uid, receivedAt: null | timestamp }
//     date

// ── Clock in with area support ─────────────────────────

export async function clockIn(branchId: string, uid: string, area = null, station = null, areaTemplate = null) {
  const date = todayStr();
  const now = Date.now();
  const recordRef = ref(db, `${employeePath(branchId, uid)}/attendance/${date}`);

  // ── Validar estado del empleado ──
  const empSnap = await get(ref(db, employeePath(branchId, uid)));
  const emp = empSnap.val();
  const empStatus = emp?.status || (emp?.active !== false ? 'active' : 'inactive');
  if (empStatus !== 'active') {
    const msgs: Record<string, string> = { suspended: 'Suspendido', vacation: 'de vacaciones', inactive: 'inactivo' };
    throw new Error(`No podés marcar entrada: estás ${msgs[empStatus] || 'inactivo'}. Consultá con tu administrador.`);
  }

  const result = await runTransaction(recordRef, (current) => {
    if (current === null) {
      const shift: Record<string, any> = {
        state: 'active',
        clockIn: now,
        clockOut: null,
        area: area || '',
        station: station || '',
        areaSnapshot: areaTemplate || null,
        checklists: {
          inicio: {},
          cierre: {},
        },
        timeline: [{ at: now, type: 'clock_in' }],
        handover: { notes: '', receivedBy: null, receivedAt: null },
        date,
      };

      // Pre-fill inicio checklist from template snapshot
      if (areaTemplate?.checklists?.inicio) {
        for (const item of areaTemplate.checklists.inicio) {
          shift.checklists.inicio[item.id] = { label: item.label, done: false, at: null };
        }
      }
      // Pre-fill cierre checklist from template snapshot
      if (areaTemplate?.checklists?.cierre) {
        for (const item of areaTemplate.checklists.cierre) {
          shift.checklists.cierre[item.id] = { label: item.label, done: false, at: null };
        }
      }

      return shift;
    }
    // Already exists — no-op
    return current;
  });

  return result.snapshot.val();
}

// ── Clock out ──────────────────────────────────────────

export async function clockOut(branchId: string, uid: string) {
  const date = todayStr();
  const now = Date.now();
  const recordRef = ref(db, `${employeePath(branchId, uid)}/attendance/${date}`);

  const result = await runTransaction(recordRef, (current) => {
    if (!current) return current; // no shift to close
    if (current.clockOut) return current; // already closed
    return {
      ...current,
      state: current.state === 'verified' ? 'verified' : 'completed',
      clockOut: now,
      timeline: [...(current.timeline || []), { at: now, type: 'clock_out' }],
    };
  });

  return result.snapshot.val();
}

// ── Break (refrigerio) ─────────────────────────────────

export async function startBreak(branchId: string, uid: string) {
  const date = todayStr();
  const now = Date.now();
  const recordRef = ref(db, `${employeePath(branchId, uid)}/attendance/${date}`);

  const result = await runTransaction(recordRef, (current) => {
    if (!current || !current.clockIn || current.clockOut) return current; // no active shift
    if (current.breakStart && !current.breakEnd) return current; // already on break
    return {
      ...current,
      breakStart: now,
      breakEnd: null,
      timeline: [...(current.timeline || []), { at: now, type: 'break_start' }],
    };
  });

  return result.snapshot.val();
}

export async function endBreak(branchId: string, uid: string) {
  const date = todayStr();
  const now = Date.now();
  const recordRef = ref(db, `${employeePath(branchId, uid)}/attendance/${date}`);

  const result = await runTransaction(recordRef, (current) => {
    if (!current || !current.breakStart || current.breakEnd) return current; // not on break
    const breakElapsed = now - current.breakStart;
    const breakMin = Math.round(breakElapsed / 60000);
    const totalBreak = (current.breakMinutes || 0) + breakMin;
    return {
      ...current,
      breakEnd: now,
      breakMinutes: totalBreak,
      timeline: [...(current.timeline || []), { at: now, type: 'break_end', data: { duration: breakMin } }],
    };
  });

  return result.snapshot.val();
}

// ── Toggle checklist item ──────────────────────────────

export async function toggleChecklistItem(branchId: string, uid: string, phase: string, itemId: string) {
  if (!['inicio', 'cierre'].includes(phase)) throw new Error('phase must be inicio or cierre');
  const date = todayStr();
  const now = Date.now();
  const itemRef = ref(db, `${employeePath(branchId, uid)}/attendance/${date}/checklists/${phase}/${itemId}`);

  const result = await runTransaction(itemRef, (current) => {
    const done = current ? !current.done : true;
    return { label: current?.label || '', done, at: done ? now : null };
  });

  // Append to timeline
  const timelineRef = ref(db, `${employeePath(branchId, uid)}/attendance/${date}/timeline`);
  await runTransaction(timelineRef, (current) => {
    const arr = current || [];
    return [...arr, { at: now, type: 'checklist_item', data: { phase, itemId, done: result.snapshot.val()?.done } }];
  });

  return result.snapshot.val();
}

// ── Handover notes ─────────────────────────────────────

export async function saveHandoverNotes(branchId: string, uid: string, notes: string) {
  const date = todayStr();
  await update(ref(db, `${employeePath(branchId, uid)}/attendance/${date}/handover`), { notes, updatedAt: Date.now() });
}

export async function confirmHandover(branchId: string, uid: string, receiverUid: string) {
  const date = todayStr();
  const now = Date.now();
  await update(ref(db, `${employeePath(branchId, uid)}/attendance/${date}/handover`), {
    receivedBy: receiverUid,
    receivedAt: now,
  });
}

// ── Verify shift (admin) ───────────────────────────────

export async function verifyShift(branchId: string, uid: string, date: string, adminUid: string) {
  const now = Date.now();
  const shiftRef = ref(db, `${employeePath(branchId, uid)}/attendance/${date}`);
  await update(shiftRef, {
    state: 'verified',
    verifiedBy: adminUid,
    verifiedAt: now,
  });
  // Append verify event
  const timelineRef = ref(db, `${employeePath(branchId, uid)}/attendance/${date}/timeline`);
  await runTransaction(timelineRef, (current) => {
    const arr = current || [];
    return [...arr, { at: now, type: 'verify', data: { by: adminUid } }];
  });
}

// ── Incident reporting ─────────────────────────────────

export async function reportIncident(branchId: string, uid: string, incident: { type?: string; description?: string }) {
  const date = todayStr();
  const incRef = push(ref(db, `${employeePath(branchId, uid)}/incidents`));
  const record: Record<string, any> = {
    date,
    type: incident.type || 'other',
    description: incident.description || '',
    reportedAt: Date.now(),
    resolvedAt: null,
    resolvedBy: null,
    notes: '',
  };
  await set(incRef, record);

  // Append to shift timeline
  const now = Date.now();
  const timelineRef = ref(db, `${employeePath(branchId, uid)}/attendance/${date}/timeline`);
  await runTransaction(timelineRef, (current) => {
    const arr = current || [];
    return [...arr, { at: now, type: 'incident', data: { id: incRef.key, type: incident.type } }];
  });

  return { success: true, incidentId: incRef.key };
}

// ── Subscriptions ──────────────────────────────────────

export function subscribeAttendance(branchId: string, uid: string, callback: (data: any) => void) {
  if (!uid) { callback(null); return () => {}; }
  const date = todayStr();
  const unsub = onValue(ref(db, `${employeePath(branchId, uid)}/attendance/${date}`), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ date, ...snap.val() });
  });
  return unsub;
}

export function subscribeAttendanceHistory(branchId: string, uid: string, callback: (data: any[]) => void) {
  if (!uid) { callback([]); return () => {}; }
  const unsub = onValue(ref(db, `${employeePath(branchId, uid)}/attendance`), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const records = Object.entries(snap.val()).map(([date, data]) => ({ date, ...(data as any) }));
    records.sort((a, b) => b.date.localeCompare(a.date));
    callback(records);
  });
  return unsub;
}

// ── Schedule ───────────────────────────────────────────

export async function getSchedule(branchId: string, uid: string) {
  if (!uid) return null;
  const snap = await get(ref(db, `${employeePath(branchId, uid)}/schedule`));
  if (!snap.exists()) return null;
  return snap.val();
}

// ── Goals / Tasks ──────────────────────────────────────

export function subscribeGoals(branchId: string, uid: string, callback: (data: any[]) => void) {
  if (!uid) { callback([]); return () => {}; }
  const unsub = onValue(ref(db, `${employeePath(branchId, uid)}/goals`), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.entries(snap.val()).map(([id, g]) => ({ id, ...(g as any) })));
  });
  return unsub;
}

// ── Incidents (read) ───────────────────────────────────

export function subscribeIncidents(branchId: string, uid: string, callback: (data: any[]) => void) {
  if (!uid) { callback([]); return () => {}; }
  const unsub = onValue(ref(db, `${employeePath(branchId, uid)}/incidents`), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.entries(snap.val()).map(([id, r]) => ({ id, ...(r as any) })));
  });
  return unsub;
}