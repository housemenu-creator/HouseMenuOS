/**
 * Employee Service — Portal Empleados data layer for house-menu.
 *
 * Reads/writes from tenants/{tenantId}/employees/{uid}
 * using the unified auth model (keyed by Firebase UID).
 *
 * Extended with:
 *  - Shift state machine (pending→active→completed→verified)
 *  - Area/station assignment per shift
 *  - Checklist items (inicio/cierre) with snapshot from area template
 *  - Timeline of events per shift
 *  - Incident reporting
 *  - Handover notes
 */

import { ref, get, set, update, push, onValue, runTransaction, serverTimestamp } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { tenantRef, tenantPath } from '../../lib/tenantService';

// ── Helpers ────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowISO() {
  return new Date().toISOString();
}

// ── Employee ───────────────────────────────────────────

export async function getEmployee(uid) {
  if (!uid) return null;
  const snap = await get(tenantRef(`employees/${uid}`));
  if (!snap.exists()) return null;
  return { uid, ...snap.val() };
}

export function subscribeEmployee(uid, callback) {
  if (!uid) { callback(null); return () => {}; }
  const unsub = onValue(tenantRef(`employees/${uid}`), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ uid, ...snap.val() });
  });
  return unsub;
}

// ── Shift (attendance extended v2) ─────────────────────
//
// Data shape:
//   tenants/{tenantId}/employees/{uid}/attendance/{date}/
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

export async function clockIn(uid, area = null, station = null, areaTemplate = null) {
  const date = todayStr();
  const now = Date.now();
  const recordRef = ref(db, tenantPath(`employees/${uid}/attendance/${date}`));

  // ── Validar estado del empleado ──
  const empSnap = await get(tenantRef(`employees/${uid}`));
  const emp = empSnap.val();
  const empStatus = emp?.status || (emp?.active !== false ? 'active' : 'inactive');
  if (empStatus !== 'active') {
    const msgs = { suspended: 'Suspendido', vacation: 'de vacaciones', inactive: 'inactivo' };
    throw new Error(`No podés marcar entrada: estás ${msgs[empStatus] || 'inactivo'}. Consultá con tu administrador.`);
  }

  // Try to fetch today's schedule to compute expected break
  let breakMinutes = 60; // default for full shifts
  try {
    const schedule = await getSchedule(uid);
    if (schedule) {
      const dayName = new Date().toLocaleDateString('es-PE', { weekday: 'long' }).toLowerCase();
      const dayData = schedule[dayName];
      if (dayData?.active && dayData?.start && dayData?.end) {
        const [sh, sm] = dayData.start.split(':').map(Number);
        const [eh, em] = dayData.end.split(':').map(Number);
        const scheduledMin = (eh * 60 + em) - (sh * 60 + sm);
        breakMinutes = scheduledMin >= 360 ? 60 : scheduledMin >= 240 ? 30 : 0;
      }
    }
  } catch {
    // If schedule fetch fails, use default
  }

  const result = await runTransaction(recordRef, (current) => {
    if (current === null) {
      const shift = {
        state: 'active',
        clockIn: now,
        clockOut: null,
        breakMinutes,
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

export async function clockOut(uid) {
  const date = todayStr();
  const now = Date.now();
  const recordRef = tenantRef(`employees/${uid}/attendance/${date}`);

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

export async function startBreak(uid) {
  const date = todayStr();
  const now = Date.now();
  const recordRef = tenantRef(`employees/${uid}/attendance/${date}`);

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

export async function endBreak(uid) {
  const date = todayStr();
  const now = Date.now();
  const recordRef = tenantRef(`employees/${uid}/attendance/${date}`);

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

export async function toggleChecklistItem(uid, phase, itemId) {
  if (!['inicio', 'cierre'].includes(phase)) throw new Error('phase must be inicio or cierre');
  const date = todayStr();
  const now = Date.now();
  const itemRef = ref(db, tenantPath(`employees/${uid}/attendance/${date}/checklists/${phase}/${itemId}`));

  const result = await runTransaction(itemRef, (current) => {
    const done = current ? !current.done : true;
    return { label: current?.label || '', done, at: done ? now : null };
  });

  // Append to timeline
  const timelineRef = ref(db, tenantPath(`employees/${uid}/attendance/${date}/timeline`));
  await runTransaction(timelineRef, (current) => {
    const arr = current || [];
    return [...arr, { at: now, type: 'checklist_item', data: { phase, itemId, done: result.snapshot.val()?.done } }];
  });

  return result.snapshot.val();
}

// ── Handover notes ─────────────────────────────────────

export async function saveHandoverNotes(uid, notes) {
  const date = todayStr();
  await update(ref(db, tenantPath(`employees/${uid}/attendance/${date}/handover`)), { notes, updatedAt: Date.now() });
}

export async function confirmHandover(uid, receiverUid) {
  const date = todayStr();
  const now = Date.now();
  await update(ref(db, tenantPath(`employees/${uid}/attendance/${date}/handover`)), {
    receivedBy: receiverUid,
    receivedAt: now,
  });
}

// ── Verify shift (admin) ───────────────────────────────

export async function verifyShift(uid, date, adminUid) {
  const now = Date.now();
  const shiftRef = tenantRef(`employees/${uid}/attendance/${date}`);
  await update(shiftRef, {
    state: 'verified',
    verifiedBy: adminUid,
    verifiedAt: now,
    timeline: runTransaction(ref(db, tenantPath(`employees/${uid}/attendance/${date}/timeline`))),
  });
  // Append verify event
  const timelineRef = ref(db, tenantPath(`employees/${uid}/attendance/${date}/timeline`));
  await runTransaction(timelineRef, (current) => {
    const arr = current || [];
    return [...arr, { at: now, type: 'verify', data: { by: adminUid } }];
  });
}

// ── Incident reporting ─────────────────────────────────

export async function reportIncident(uid, incident) {
  const date = todayStr();
  const incRef = push(ref(db, tenantPath(`employees/${uid}/incidents`)));
  const record = {
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
  const timelineRef = ref(db, tenantPath(`employees/${uid}/attendance/${date}/timeline`));
  await runTransaction(timelineRef, (current) => {
    const arr = current || [];
    return [...arr, { at: now, type: 'incident', data: { id: incRef.key, type: incident.type } }];
  });

  return { success: true, incidentId: incRef.key };
}

// ── Subscriptions ──────────────────────────────────────

export function subscribeAttendance(uid, callback) {
  if (!uid) { callback(null); return () => {}; }
  const date = todayStr();
  const unsub = onValue(ref(db, tenantPath(`employees/${uid}/attendance/${date}`)), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ date, ...snap.val() });
  });
  return unsub;
}

export function subscribeAttendanceHistory(uid, callback) {
  if (!uid) { callback([]); return () => {}; }
  const unsub = onValue(tenantRef(`employees/${uid}/attendance`), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const records = Object.entries(snap.val()).map(([date, data]) => ({ date, ...data }));
    records.sort((a, b) => b.date.localeCompare(a.date));
    callback(records);
  });
  return unsub;
}

// ── Schedule ───────────────────────────────────────────

export async function getSchedule(uid) {
  if (!uid) return null;
  const snap = await get(tenantRef(`employees/${uid}/schedule`));
  if (!snap.exists()) return null;
  return snap.val();
}

// ── Goals / Tasks ──────────────────────────────────────

export function subscribeGoals(uid, callback) {
  if (!uid) { callback([]); return () => {}; }
  const unsub = onValue(tenantRef(`employees/${uid}/goals`), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.entries(snap.val()).map(([id, g]) => ({ id, ...g })));
  });
  return unsub;
}

// ── Incidents (read) ───────────────────────────────────

export function subscribeIncidents(uid, callback) {
  if (!uid) { callback([]); return () => {}; }
  const unsub = onValue(tenantRef(`employees/${uid}/incidents`), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.entries(snap.val()).map(([id, r]) => ({ id, ...r })));
  });
  return unsub;
}
