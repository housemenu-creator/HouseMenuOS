import { ref, get, set, push, update, remove, onValue, runTransaction } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { nowISO, todayISO, dateKey } from './format';
import { createUser, updateUser, deleteUser } from './authService';
import { tenantRef, tenantPath } from './tenantService';
import { deliveryService } from './deliveryService';

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
    docType: data.docType || 'dni',
    docNum: data.docNum || '',
    role: data.role || 'mozo',
    area: data.area || '',
    station: data.station || '',
    pin: data.pin || '',
    status: data.status || 'active',
    startDate: data.startDate || nowISO(),
    hourlyRate: data.hourlyRate || 0,
    notes: data.notes || '',
    userId: null,  // linked user account
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  // Auto-create user account for operational roles
  let userWarning = null;
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
    } else {
      userWarning = userResult.error || 'No se pudo crear el usuario del empleado. Podés reintentarlo manualmente.';
    }
  }

  await set(empRef, employee);

  // Auto-create driver record for delivery role
  let driverWarning = null;
  if (employee.role === 'delivery' && employee.email) {
    const driverResult = await deliveryService.createDriver(branchId, {
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      vehicle: data.vehicle || 'Moto',
      userId: employee.userId || undefined,
    });
    if (!driverResult.success) {
      driverWarning = 'Empleado creado, pero no se pudo crear el registro de repartidor automáticamente. Podés crearlo manualmente desde Admin > Delivery.';
    }
  }

  return { id: empRef.key, ...employee, _userWarning: userWarning, _driverWarning: driverWarning };
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

  if (currentUserId && (updates.email || updates.name || updates.role || updates.pin || updates.active !== undefined || updates.status || updates.statusEnd)) {
    const userUpdates = {};
    if (updates.email) userUpdates.email = updates.email;
    if (updates.name) userUpdates.name = updates.name;
    if (updates.role) userUpdates.role = updates.role;
    if (updates.pin) userUpdates.pin = updates.pin;
    if (updates.active !== undefined) userUpdates.active = updates.active;
    if (updates.status) userUpdates.status = updates.status;
    if (updates.statusEnd) userUpdates.statusEnd = updates.statusEnd;
    if (Object.keys(userUpdates).length > 0) {
      await updateUser(currentUserId, userUpdates);
    }
  }

  await update(employeeRef(branchId, employeeId), updates);
  return updates;
}

/**
 * Retry creating a user account for an existing employee that has no userId.
 * Used when the initial createUser failed (e.g. network error, permission denied).
 * Updates the branch employee record with the new userId on success.
 */
export async function createUserForEmployee(branchId, employeeId) {
  const snap = await get(employeeRef(branchId, employeeId));
  const emp = snap.val();
  if (!emp) return { success: false, error: 'Empleado no encontrado' };
  if (emp.userId) return { success: false, error: 'El empleado ya tiene un usuario vinculado' };
  if (!emp.email) return { success: false, error: 'El empleado no tiene email. Asignale un email primero.' };
  if (!ROLES_WITH_LOGIN.includes(emp.role)) return { success: false, error: `El rol ${emp.role} no requiere acceso al sistema.` };

  const userResult = await createUser({
    email: emp.email,
    name: emp.name,
    role: emp.role,
    pin: emp.pin,
    branchIds: { [branchId]: true },
  });

  if (!userResult.success) {
    return { success: false, error: userResult.error || 'Error al crear el usuario. Revisá que el email no esté ya registrado.' };
  }

  await update(employeeRef(branchId, employeeId), { userId: userResult.userId, updatedAt: nowISO() });
  return { success: true, userId: userResult.userId };
}

export async function deleteEmployee(branchId, employeeId, actorRole) {
  // Read employee to get linked userId before deleting
  const snap = await get(employeeRef(branchId, employeeId));
  const emp = snap.val();
  const userId = emp?.userId;

  // If linked to a system user, clean up user record + role cache FIRST
  // Doing this before branch removal so we can still read the employee
  let userResult = { success: true };
  if (userId) {
    userResult = await deleteUser(userId, 'system', actorRole);
  }

  // ── Si deleteUser fue rechazado (admin/superadmin protegido), NO eliminar branch ──
  if (!userResult.success) return userResult;

  // Remove from branch path (only if user clean succeeded or no link)
  await remove(employeeRef(branchId, employeeId));

  // If cascade delete failed, the branch record is still intact and user is untouched
  // — caller can inspect userResult.success to know the outcome
  return userResult;
}

// ── Schedule ───────────────────────────────────────────

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DAY_MAP = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function todayDayName() {
  const [y, m, d] = dateKey().split('-').map(Number);
  return DAY_MAP[new Date(y, m - 1, d).getDay()];
}

function scheduleRef(branchId, employeeId) {
  return ref(db, `branches/${branchId}/employees/${employeeId}/schedule`);
}

export async function getSchedule(branchId, employeeId) {
  const snap = await get(scheduleRef(branchId, employeeId));
  if (!snap.exists()) return DAYS.map(d => ({ day: d, start: '', end: '', active: false }));
  const saved = snap.val();
  // Merge with full week — ensure `day` is always present
  return DAYS.map(d => ({ day: d, ...(saved[d] || { start: '', end: '', active: false }) }));
}

export async function saveSchedule(branchId, employeeId, weekData, userId) {
  // weekData is array of { day, start, end, active }
  const obj = {};
  for (const entry of weekData) {
    if (entry.active && entry.start && entry.end) {
      obj[entry.day] = { start: entry.start, end: entry.end, active: true };
    } else {
      obj[entry.day] = { start: '', end: '', active: false };
    }
  }
  // Save to branch path (admin reads from here)
  await set(scheduleRef(branchId, employeeId), obj);
  // Sync to tenant path so the employee can see their schedule in /staff/empleados
  if (userId) {
    await set(tenantRef(`employees/${userId}/schedule`), obj);
  }
}

// ── Attendance (unified — reads from tenants/{tenant}/employees/{uid}/attendance) ──

/**
 * Subscribe to today's attendance for ALL employees under the tenant path.
 * Returns data keyed by userId (the tenant-level UID).
 * The consumer (EmployeesTab) maps userId → pushId using the employee list.
 */
export function subscribeTodayAttendance(branchId, callback) {
  const today = todayISO();

  // Subscribe to all employees under tenants path, extract today's attendance per employee
  const unsub = onValue(tenantRef('employees'), (snap) => {
    const data = snap.val();
    if (!data) { callback({}); return; }
    const result = {};
    for (const [userId, emp] of Object.entries(data)) {
      if (emp.attendance && emp.attendance[today]) {
        result[userId] = emp.attendance[today];
      }
    }
    callback(result);
  });
  return unsub;
}

/**
 * Clock in an employee. Validates they have a schedule for today first.
 * Auto-calculates breakMinutes based on shift duration:
 *   >= 6h → 60min, >= 4h → 30min, < 4h → 0min
 * Writes to tenants/{tenant}/employees/{userId}/attendance/{today}.
 */
export async function clockIn(branchId, employeeId, userId) {
  if (!userId) {
    console.warn('clockIn: no userId provided, skipping');
    return null;
  }

  // ── Validar horario para hoy ──
  const schedule = await getSchedule(branchId, employeeId);
  const todayName = todayDayName();
  const todayEntry = schedule.find(d => d.day === todayName);
  if (!todayEntry || !todayEntry.active || !todayEntry.start || !todayEntry.end) {
    throw new Error(`No tenés horario asignado para ${todayName}. Consultá con tu administrador.`);
  }

  // ── Validar estado del empleado ──
  const empSnap = await get(employeeRef(branchId, employeeId));
  const empData = empSnap.val();
  const empStatus = empData?.status || (empData?.active !== false ? 'active' : 'inactive');
  if (empStatus === 'suspended') {
    throw new Error('El empleado está suspendido. No puede marcar entrada.');
  }
  if (empStatus === 'vacation') {
    throw new Error('El empleado está de vacaciones. No puede marcar entrada.');
  }
  if (empStatus === 'inactive') {
    throw new Error('El empleado está inactivo. No puede marcar entrada.');
  }

  // ── Calcular break esperado ──
  // Duración programada del turno
  const [sh, sm] = todayEntry.start.split(':').map(Number);
  const [eh, em] = todayEntry.end.split(':').map(Number);
  const scheduledMin = (eh * 60 + em) - (sh * 60 + sm);
  // Política: >= 6h → 60min break, >= 4h → 30min, sino 0
  const breakMinutes = scheduledMin >= 360 ? 60 : scheduledMin >= 240 ? 30 : 0;

  const today = todayISO();
  const recordRef = tenantRef(`employees/${userId}/attendance/${today}`);

  const result = await runTransaction(recordRef, (current) => {
    if (current === null) {
      return {
        state: 'active',
        clockIn: Date.now(),
        clockOut: null,
        date: today,
        area: '',
        station: '',
        areaSnapshot: null,
        breakMinutes,
        checklists: { inicio: {}, cierre: {} },
        timeline: [{ at: Date.now(), type: 'clock_in' }],
        handover: { notes: '', receivedBy: null, receivedAt: null },
      };
    }
    // Already clocked in — no-op
    return current;
  });

  return result.snapshot.val();
}

/**
 * Admin force clock-out. Writes to tenants/{tenant}/employees/{userId}/attendance/{today}.
 */
export async function clockOut(branchId, employeeId, userId) {
  if (!userId) {
    console.warn('clockOut: no userId provided, skipping');
    return null;
  }
  const today = todayISO();
  const recordRef = tenantRef(`employees/${userId}/attendance/${today}`);

  const result = await runTransaction(recordRef, (current) => {
    if (current && current.clockIn && !current.clockOut) {
      return {
        ...current,
        state: 'completed',
        clockOut: Date.now(),
        timeline: [
          ...(current.timeline || []),
          { at: Date.now(), type: 'clock_out' },
        ],
      };
    }
    return current;
  });

  return result.snapshot.val();
}

/**
 * Get attendance history for a specific employee (by userId).
 */
export async function getAttendanceHistory(branchId, employeeId, userId, daysBack = 30) {
  if (!userId) return [];

  const snap = await get(tenantRef(`employees/${userId}/attendance`));
  if (!snap.exists()) return [];

  const cutoff = Date.now() - daysBack * 86400000;
  return Object.entries(snap.val())
    .map(([date, record]) => ({ date, ...record }))
    .filter(r => (r.clockIn || 0) >= cutoff)
    .sort((a, b) => (b.clockIn || 0) - (a.clockIn || 0));
}

/**
 * Admin: update a specific attendance field (e.g. breakMinutes).
 */
export async function updateAttendance(userId, date, updates) {
  if (!userId || !date) return;
  await update(tenantRef(`employees/${userId}/attendance/${date}`), updates);
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
