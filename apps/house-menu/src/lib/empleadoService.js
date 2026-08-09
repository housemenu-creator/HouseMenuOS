import { ref, get, child, update, set, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

// ── Employee lookup ──

export async function getEmployeeByPin(pin, branchId) {
  if (!pin || !branchId) return null;
  const snap = await get(child(ref(db), `branches/${branchId}/employees`));
  if (!snap.exists()) return null;
  for (const [id, emp] of Object.entries(snap.val())) {
    if (emp.pin === pin && emp.active !== false) return { id, ...emp };
  }
  return null;
}

export function subscribeEmployee(employeeId, branchId, callback) {
  const empRef = ref(db, `branches/${branchId}/employees/${employeeId}`);
  return onValue(empRef, (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ id: employeeId, ...snap.val() });
  });
}

// ── Attendance ──

function todayStr() { return new Date().toISOString().slice(0, 10); }

export async function clockIn(employeeId, branchId) {
  const date = todayStr();
  const now = new Date().toISOString();
  await set(ref(db, `branches/${branchId}/attendance/${employeeId}/${date}`), { employeeId, date, clockIn: now, status: 'presente' });
}

export async function clockOut(employeeId, branchId) {
  const date = todayStr();
  const now = new Date().toISOString();
  await update(ref(db, `branches/${branchId}/attendance/${employeeId}/${date}`), { clockOut: now });
}

export function subscribeAttendance(employeeId, branchId, callback) {
  const date = todayStr();
  const attRef = ref(db, `branches/${branchId}/attendance/${employeeId}/${date}`);
  return onValue(attRef, (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ date, ...snap.val() });
  });
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

// ── Schedule ──

export async function getSchedule(employeeId, branchId) {
  const snap = await get(child(ref(db), `branches/${branchId}/employees/${employeeId}/schedule`));
  return snap.exists() ? snap.val() : null;
}

// ── Goals / Tasks ──

export function subscribeGoals(employeeId, branchId, callback) {
  const goalsRef = ref(db, `branches/${branchId}/employees/${employeeId}/goals`);
  return onValue(goalsRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.entries(snap.val()).map(([id, g]) => ({ id, ...g })));
  });
}
