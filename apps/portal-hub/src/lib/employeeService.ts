import { ref, get, child, update, set, onValue, Unsubscribe } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import type { Employee, Attendance, Goal } from '../types';

// ── Lookup ──

export async function getEmployeeByPin(pin: string, branchId: string): Promise<Employee | null> {
  if (!pin || !branchId) return null;
  const snap = await get(child(ref(db), `branches/${branchId}/employees`));
  if (!snap.exists()) return null;
  const employees = snap.val() as Record<string, Employee>;
  for (const [id, emp] of Object.entries(employees)) {
    if (emp.pin === pin && emp.active !== false) {
      return { id, ...emp };
    }
  }
  return null;
}

export async function getEmployeeById(employeeId: string, branchId: string): Promise<Employee | null> {
  if (!employeeId || !branchId) return null;
  const snap = await get(child(ref(db), `branches/${branchId}/employees/${employeeId}`));
  if (!snap.exists()) return null;
  return { id: employeeId, ...snap.val() } as Employee;
}

export function subscribeEmployee(
  employeeId: string,
  branchId: string,
  callback: (emp: Employee | null) => void
): Unsubscribe {
  const empRef = ref(db, `branches/${branchId}/employees/${employeeId}`);
  return onValue(empRef, (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ id: employeeId, ...snap.val() } as Employee);
  });
}

// ── Attendance ──

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function attendanceRef(branchId: string, employeeId: string, date: string) {
  return ref(db, `branches/${branchId}/attendance/${employeeId}/${date}`);
}

export async function getTodayAttendance(employeeId: string, branchId: string): Promise<Attendance | null> {
  const date = todayStr();
  const snap = await get(attendanceRef(branchId, employeeId, date));
  if (!snap.exists()) return null;
  return { date, ...snap.val() } as Attendance;
}

export async function clockIn(employeeId: string, branchId: string): Promise<Attendance> {
  const date = todayStr();
  const now = new Date().toISOString();
  const record: Attendance = { employeeId, date, clockIn: now, status: 'presente' };
  await set(attendanceRef(branchId, employeeId, date), record);
  return record;
}

export async function clockOut(employeeId: string, branchId: string): Promise<{ date: string; clockOut: string }> {
  const date = todayStr();
  const now = new Date().toISOString();
  await update(attendanceRef(branchId, employeeId, date), { clockOut: now });
  return { date, clockOut: now };
}

export function subscribeAttendance(
  employeeId: string,
  branchId: string,
  callback: (att: Attendance | null) => void
): Unsubscribe {
  const date = todayStr();
  const attRef = attendanceRef(branchId, employeeId, date);
  return onValue(attRef, (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ date, ...snap.val() } as Attendance);
  });
}

// ── Attendance History ──

export async function getAttendanceHistory(
  employeeId: string,
  branchId: string,
  limitDays = 30
): Promise<Attendance[]> {
  if (!employeeId || !branchId) return [];
  const snap = await get(child(ref(db), `branches/${branchId}/attendance/${employeeId}`));
  if (!snap.exists()) return [];
  const records = Object.entries(snap.val()).map(([date, data]) => ({ date, ...data } as Attendance));
  return records.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limitDays);
}

export function subscribeAttendanceHistory(
  employeeId: string,
  branchId: string,
  callback: (records: Attendance[]) => void
): Unsubscribe {
  const attRef = ref(db, `branches/${branchId}/attendance/${employeeId}`);
  return onValue(attRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const records = Object.entries(snap.val()).map(([date, data]) => ({ date, ...data } as Attendance));
    records.sort((a, b) => b.date.localeCompare(a.date));
    callback(records);
  });
}

// ── Schedule ──

export async function getSchedule(employeeId: string, branchId: string) {
  const snap = await get(child(ref(db), `branches/${branchId}/employees/${employeeId}/schedule`));
  if (!snap.exists()) return null;
  return snap.val();
}

// ── Goals / Tasks ──

export async function getGoals(employeeId: string, branchId: string): Promise<Goal[]> {
  const snap = await get(child(ref(db), `branches/${branchId}/employees/${employeeId}/goals`));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, g]) => ({ id, ...g } as Goal));
}

export function subscribeGoals(
  employeeId: string,
  branchId: string,
  callback: (goals: Goal[]) => void
): Unsubscribe {
  const goalsRef = ref(db, `branches/${branchId}/employees/${employeeId}/goals`);
  return onValue(goalsRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.entries(snap.val()).map(([id, g]) => ({ id, ...g } as Goal)));
  });
}
