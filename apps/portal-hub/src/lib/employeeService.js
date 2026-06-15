/**
 * Employee Service — Firebase data layer for Portal Empleados.
 *
 * Reads/writes from branches/{branchId}/employees/{empId}
 * and branches/{branchId}/attendance/{empId}/{date}
 */

import { ref, get, child, update, push, set, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

// ── Lookup ─────────────────────────────────────────────

export async function getEmployeeByPin(pin, branchId) {
  if (!pin || !branchId) return null;
  const snap = await get(child(ref(db), `branches/${branchId}/employees`));
  if (!snap.exists()) return null;
  const employees = snap.val();
  for (const [id, emp] of Object.entries(employees)) {
    if (emp.pin === pin && emp.active !== false) {
      return { id, ...emp };
    }
  }
  return null;
}

export async function getEmployeeById(employeeId, branchId) {
  if (!employeeId || !branchId) return null;
  const snap = await get(child(ref(db), `branches/${branchId}/employees/${employeeId}`));
  if (!snap.exists()) return null;
  return { id: employeeId, ...snap.val() };
}

export function subscribeEmployee(employeeId, branchId, callback) {
  const empRef = ref(db, `branches/${branchId}/employees/${employeeId}`);
  return onValue(empRef, (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ id: employeeId, ...snap.val() });
  });
}

// ── Attendance ──────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function attendanceRef(branchId, employeeId, date) {
  return ref(db, `branches/${branchId}/attendance/${employeeId}/${date}`);
}

export async function getTodayAttendance(employeeId, branchId) {
  const date = todayStr();
  const snap = await get(attendanceRef(branchId, employeeId, date));
  if (!snap.exists()) return null;
  return { date, ...snap.val() };
}

export async function clockIn(employeeId, branchId) {
  const date = todayStr();
  const now = new Date().toISOString();
  const record = {
    employeeId,
    date,
    clockIn: now,
    status: 'presente',
  };
  await set(attendanceRef(branchId, employeeId, date), record);
  return record;
}

export async function clockOut(employeeId, branchId) {
  const date = todayStr();
  const now = new Date().toISOString();
  await update(attendanceRef(branchId, employeeId, date), { clockOut: now });
  return { date, clockOut: now };
}

export function subscribeAttendance(employeeId, branchId, callback) {
  const date = todayStr();
  const attRef = attendanceRef(branchId, employeeId, date);
  return onValue(attRef, (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ date, ...snap.val() });
  });
}

// ── Attendance History ────────────────────────────────────

/**
 * Fetch all attendance records for an employee (past days).
 * Returns array sorted by date desc.
 */
export async function getAttendanceHistory(employeeId, branchId, limitDays = 30) {
  if (!employeeId || !branchId) return [];
  const snap = await get(child(ref(db), `branches/${branchId}/attendance/${employeeId}`));
  if (!snap.exists()) return [];
  const records = Object.entries(snap.val()).map(([date, data]) => ({ date, ...data }));
  // Sort by date descending, limit
  return records
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limitDays);
}

export function subscribeAttendanceHistory(employeeId, branchId, callback) {
  const attRef = ref(db, `branches/${branchId}/attendance/${employeeId}`);
  return onValue(attRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const records = Object.entries(snap.val()).map(([date, data]) => ({ date, ...data }));
    records.sort((a, b) => b.date.localeCompare(a.date));
    callback(records);
  });
}

// ── Schedule ────────────────────────────────────────────

export async function getSchedule(employeeId, branchId) {
  const snap = await get(child(ref(db), `branches/${branchId}/employees/${employeeId}/schedule`));
  if (!snap.exists()) return null;
  return snap.val();
}

// ── Goals / Tasks ───────────────────────────────────────

export async function getGoals(employeeId, branchId) {
  const snap = await get(child(ref(db), `branches/${branchId}/employees/${employeeId}/goals`));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, g]) => ({ id, ...g }));
}

export function subscribeGoals(employeeId, branchId, callback) {
  const goalsRef = ref(db, `branches/${branchId}/employees/${employeeId}/goals`);
  return onValue(goalsRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.entries(snap.val()).map(([id, g]) => ({ id, ...g })));
  });
}
