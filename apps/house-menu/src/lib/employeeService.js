import { ref, get, set, push, update, remove, onValue, runTransaction } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { nowISO, todayISO } from './format';
import { createUser, updateUser } from './authService';

// ── Employee CRUD ──────────────────────────────────────

function employeesRef(branchId) {
  return ref(db, `branches/${branchId}/employees`);
}

function employeeRef(branchId, employeeId) {
  return ref(db, `branches/${branchId}/employees/${employeeId}`);
}

export async function getEmployees(branchId) {
  const snap = await get(employeesRef(branchId));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, e]) => ({ id, ...e }));
}

export function subscribeEmployees(branchId, callback) {
  const unsub = onValue(employeesRef(branchId), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, e]) => ({ id, ...e })));
  });
  return unsub;
}

// Roles que requieren acceso al sistema (tienen login)
const ROLES_WITH_LOGIN = ['admin', 'cajero', 'kitchen', 'dispatch', 'delivery', 'mozo', 'vendedor'];

export async function createEmployee(branchId, data) {
  const empRef = push(employeesRef(branchId));
  const employee = {
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    role: data.role || 'mozo',
    pin: data.pin || '',
    active: true,
    startDate: data.startDate || nowISO(),
    hourlyRate: data.hourlyRate || 0,
    notes: data.notes || '',
    userId: null,  // linked user account
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  // Auto-create user account for operational roles
  if (employee.email && ROLES_WITH_LOGIN.includes(employee.role)) {
    const userResult = await createUser({
      email: employee.email,
      name: employee.name,
      role: employee.role,
      pin: employee.pin,
      branchIds: { [branchId]: true },
    });
    if (userResult.success && userResult.userId) {
      employee.userId = userResult.userId;
    }
  }

  await set(empRef, employee);
  return { id: empRef.key, ...employee };
}

export async function updateEmployee(branchId, employeeId, data) {
  const updates = { ...data, updatedAt: nowISO() };
  // Don't allow overwriting id or createdAt
  delete updates.id;
  delete updates.createdAt;

  // If employee has a linked user, sync relevant fields
  const existingSnap = await get(employeeRef(branchId, employeeId));
  const existing = existingSnap.val();
  const currentUserId = existing?.userId;

  if (currentUserId && (updates.email || updates.name || updates.role || updates.pin || updates.active !== undefined)) {
    const userUpdates = {};
    if (updates.email) userUpdates.email = updates.email;
    if (updates.name) userUpdates.name = updates.name;
    if (updates.role) userUpdates.role = updates.role;
    if (updates.pin) userUpdates.pin = updates.pin;
    if (updates.active !== undefined) userUpdates.active = updates.active;
    if (Object.keys(userUpdates).length > 0) {
      await updateUser(currentUserId, userUpdates);
    }
  }

  await update(employeeRef(branchId, employeeId), updates);
  return updates;
}

export async function deleteEmployee(branchId, employeeId) {
  await remove(employeeRef(branchId, employeeId));
}

// ── Schedule ───────────────────────────────────────────

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function scheduleRef(branchId, employeeId) {
  return ref(db, `branches/${branchId}/employees/${employeeId}/schedule`);
}

export async function getSchedule(branchId, employeeId) {
  const snap = await get(scheduleRef(branchId, employeeId));
  if (!snap.exists()) return DAYS.map(d => ({ day: d, start: '', end: '', active: false }));
  const saved = snap.val();
  // Merge with full week
  return DAYS.map(d => saved[d] || { day: d, start: '', end: '', active: false });
}

export async function saveSchedule(branchId, employeeId, weekData) {
  // weekData is array of { day, start, end, active }
  const obj = {};
  for (const entry of weekData) {
    if (entry.active && entry.start && entry.end) {
      obj[entry.day] = { start: entry.start, end: entry.end, active: true };
    } else {
      obj[entry.day] = { start: '', end: '', active: false };
    }
  }
  await set(scheduleRef(branchId, employeeId), obj);
}

// ── Attendance ─────────────────────────────────────────

function attendanceRef(branchId) {
  return ref(db, `branches/${branchId}/attendance`);
}

function employeeAttendanceRef(branchId, employeeId) {
  return ref(db, `branches/${branchId}/attendance/${employeeId}`);
}

export async function clockIn(branchId, employeeId) {
  const today = todayISO();
  const recordRef = ref(db, `branches/${branchId}/attendance/${employeeId}/${today}`);

  // Run transaction to avoid double clock-in
  const result = await runTransaction(recordRef, (current) => {
    if (current === null) {
      return {
        employeeId,
        date: today,
        clockIn: Date.now(),
        clockOut: null,
        branchId,
      };
    }
    // Already clocked in — no-op
    return current;
  });

  return result.snapshot.val();
}

export async function clockOut(branchId, employeeId) {
  const today = todayISO();
  const recordRef = ref(db, `branches/${branchId}/attendance/${employeeId}/${today}`);

  const result = await runTransaction(recordRef, (current) => {
    if (current && current.clockIn && !current.clockOut) {
      return { ...current, clockOut: Date.now() };
    }
    return current;
  });

  return result.snapshot.val();
}

export async function getTodayAttendance(branchId) {
  const today = todayISO();
  const snap = await get(attendanceRef(branchId));
  if (!snap.exists()) return {};

  const all = snap.val();
  const result = {};
  for (const [empId, days] of Object.entries(all)) {
    if (days[today]) {
      result[empId] = days[today];
    }
  }
  return result;
}

export function subscribeTodayAttendance(branchId, callback) {
  const today = todayISO();

  // We subscribe to the whole attendance node and filter client-side
  const unsub = onValue(attendanceRef(branchId), (snap) => {
    const data = snap.val();
    if (!data) { callback({}); return; }
    const result = {};
    for (const [empId, days] of Object.entries(data)) {
      if (days[today]) {
        result[empId] = days[today];
      }
    }
    callback(result);
  });
  return unsub;
}

export async function getAttendanceHistory(branchId, employeeId, daysBack = 30) {
  const snap = await get(employeeAttendanceRef(branchId, employeeId));
  if (!snap.exists()) return [];

  const cutoff = Date.now() - daysBack * 86400000;
  return Object.entries(snap.val())
    .map(([date, record]) => ({ date, ...record }))
    .filter(r => r.clockIn >= cutoff || r.clockIn == null)
    .sort((a, b) => (b.clockIn || 0) - (a.clockIn || 0));
}

// ── Goals ──────────────────────────────────────────────

function goalsRef(branchId, employeeId) {
  return ref(db, `branches/${branchId}/employees/${employeeId}/goals`);
}

export async function getGoals(branchId, employeeId) {
  const snap = await get(goalsRef(branchId, employeeId));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, g]) => ({ id, ...g }));
}

export async function setGoal(branchId, employeeId, goal) {
  const gRef = goal.id ? ref(db, `branches/${branchId}/employees/${employeeId}/goals/${goal.id}`) : push(goalsRef(branchId, employeeId));
  const data = {
    metric: goal.metric,
    target: Number(goal.target) || 0,
    period: goal.period || 'monthly',
    label: goal.label || '',
    startDate: goal.startDate || nowISO(),
    active: goal.active !== false,
    updatedAt: nowISO(),
  };
  await set(gRef, data);
  return { id: gRef.key, ...data };
}

export async function deleteGoal(branchId, employeeId, goalId) {
  await remove(ref(db, `branches/${branchId}/employees/${employeeId}/goals/${goalId}`));
}

// ── Computed KPIs ──────────────────────────────────────

export function computeEmployeeKPI(orders, employeeId, employeeName) {
  const employeeOrders = orders.filter(o =>
    (o.assignedTo === employeeId || o.assignedTo === employeeName ||
     o.createdBy === employeeId || o.createdBy === employeeName ||
     o.driverId === employeeId || o.driverName === employeeName)
  );

  return {
    totalOrders: employeeOrders.length,
    totalRevenue: employeeOrders.reduce((sum, o) => sum + (o.financials?.total || 0), 0),
    avgOrderValue: employeeOrders.length > 0
      ? employeeOrders.reduce((sum, o) => sum + (o.financials?.total || 0), 0) / employeeOrders.length
      : 0,
    deliveryOrders: employeeOrders.filter(o => o.type === 'delivery' || o.driverId).length,
    tableOrders: employeeOrders.filter(o => o.type !== 'delivery' && !o.driverId).length,
    cancellations: employeeOrders.filter(o => o.status === 'cancelado').length,
  };
}
