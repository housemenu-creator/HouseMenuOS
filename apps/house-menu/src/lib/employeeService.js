import { ref, get, set, push, update, remove, onValue, runTransaction, query, limitToLast, orderByKey } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { nowISO, todayISO, dateKey } from './format';
import { createUser, updateUser, deleteUser } from './authService';
import { tenantRef, tenantPath } from './tenantService';
import { deliveryService } from './deliveryService';

// ── Employee CRUD ──────────────────────────────────────
// Fuente de verdad: tenants/{tenant}/employees (clave = userId).
// branches/{branch}/employees queda SOLO como legado para empleados
// sin cuenta (roles sin login o pre-migración).

function employeesRef(branchId) {
  return ref(db, `branches/${branchId}/employees`);
}

function employeeRef(branchId, employeeId) {
  return ref(db, `branches/${branchId}/employees/${employeeId}`);
}

// Normaliza un tenant employee (nested profile) + aportes flat del branch legacy
// en la forma plana que consume el admin. id === userId (clave tenant).
function flatEmployee(userId, tenantEmp, branchEmp) {
  const p = tenantEmp?.profile || {};
  const legacy = branchEmp || {};
  return {
    id: userId,
    userId, // self-link: el id YA es el tenant key
    name: p.name || tenantEmp?.name || legacy.name || '',
    email: p.email || tenantEmp?.email || legacy.email || '',
    phone: p.phone || tenantEmp?.phone || legacy.phone || '',
    role: tenantEmp?.role || legacy.role || 'kitchen',
    status: tenantEmp?.status || legacy.status || null,
    statusEnd: tenantEmp?.statusEnd || legacy.statusEnd || null,
    active: p.active !== undefined ? p.active
      : tenantEmp?.active !== undefined ? tenantEmp.active
      : legacy.active !== false,
    docType: tenantEmp?.docType || legacy.docType || 'dni',
    docNum: tenantEmp?.docNum || p.dni || legacy.docNum || '',
    area: tenantEmp?.area || legacy.area || '',
    station: tenantEmp?.station || legacy.station || '',
    startDate: tenantEmp?.startDate || legacy.startDate || null,
    hourlyRate: tenantEmp?.hourlyRate ?? legacy.hourlyRate ?? 0,
    notes: tenantEmp?.notes || legacy.notes || '',
    firebaseUid: tenantEmp?.firebaseUid || null,
    branches: tenantEmp?.branches || legacy.branches || {},
    homeBranch: tenantEmp?.homeBranch || null,
    schedule: tenantEmp?.schedule || legacy.schedule || null,
    profile: p,
  };
}

// Merge tenant (todos) + branch legacy (solo los SIN cuenta → no duplicados).
function mergeEmployees(tenantData, branchData) {
  const result = [];
  const branchByUserId = new Map();
  const branchLegacy = [];
  for (const [pushId, rec] of Object.entries(branchData || {})) {
    if (rec?.userId) {
      if (!branchByUserId.has(rec.userId)) branchByUserId.set(rec.userId, { pushId, rec });
    } else {
      branchLegacy.push([pushId, rec]);
    }
  }
  for (const [userId, rec] of Object.entries(tenantData || {})) {
    const linked = branchByUserId.get(userId);
    result.push(flatEmployee(userId, rec, linked?.rec));
  }
  // branch con userId sin tenant record (huérfano de migración): lo mostramos
  // con id = userId para que el CRUD siga operando sobre el tenant key
  for (const [userId, { rec }] of branchByUserId) {
    if (!tenantData?.[userId]) result.push(flatEmployee(userId, null, rec));
  }
  // legado sin cuenta
  for (const [pushId, rec] of branchLegacy) {
    result.push({ id: pushId, userId: null, schedule: rec.schedule || null, ...rec, profile: {} });
  }
  return result;
}

async function readTenantEmployees() {
  const snap = await get(tenantRef('employees'));
  return snap.exists() ? snap.val() : null;
}

export async function getEmployees(branchId) {
  const [tenantSnap, branchSnap] = await Promise.all([
    readTenantEmployees(),
    get(employeesRef(branchId)),
  ]);
  return mergeEmployees(tenantSnap, branchSnap.exists() ? branchSnap.val() : null);
}

// Cache de últimos snapshots: al re-montar el tab (AdminTabRenderer key={activeTab})
// se emite de inmediato la última lista en vez de arrancar vacía hasta la red.
const tenantCache = { val: null, has: false };
const branchCache = new Map(); // branchId → data

export function subscribeEmployees(branchId, callback) {
  if (tenantCache.has && branchCache.has(branchId)) {
    callback(mergeEmployees(tenantCache.val, branchCache.get(branchId)));
  }
  let tenantData = tenantCache.val;
  let branchData = branchCache.has(branchId) ? branchCache.get(branchId) : null;
  let tenantReady = tenantCache.has;
  let branchReady = branchCache.has(branchId);
  const emit = () => {
    if (!tenantReady || !branchReady) return;
    tenantCache.val = tenantData;
    tenantCache.has = true;
    branchCache.set(branchId, branchData);
    callback(mergeEmployees(tenantData, branchData));
  };
  const unsubTenant = onValue(tenantRef('employees'), (snap) => {
    tenantData = snap.val() || null;
    tenantReady = true;
    emit();
  });
  const unsubBranch = onValue(employeesRef(branchId), (snap) => {
    branchData = snap.val() || null;
    branchReady = true;
    emit();
  });
  return () => {
    unsubTenant();
    unsubBranch();
  };
}

// Roles que requieren acceso al sistema (tienen login)
const ROLES_WITH_LOGIN = ['admin', 'cajero', 'kitchen', 'dispatch', 'delivery', 'mozo', 'vendedor'];

export async function createEmployee(branchId, data) {
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
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  // Auto-create user account (tenant record) for operational roles
  let userWarning = null;
  let userId = null;
  if (employee.email && ROLES_WITH_LOGIN.includes(employee.role)) {
    const userResult = await createUser({
      email: employee.email,
      name: employee.name,
      role: employee.role,
      pin: employee.pin,
      branchIds: { [branchId]: true },
    });
    if (userResult.success && userResult.userId) {
      userId = userResult.userId;
    } else {
      userWarning = userResult.error || 'No se pudo crear el usuario del empleado. Podés reintentarlo manualmente.';
    }
  }

  let empId;
  if (userId) {
    empId = userId;
    // El record de cuenta (createUser) ya tiene profile/role/branches;
    // agregamos los campos flat del formulario admin al mismo record.
    const flat = { ...employee };
    delete flat.name;
    delete flat.email;
    delete flat.role;
    delete flat.pin;
    delete flat.createdAt;
    await update(tenantRef(`employees/${empId}`), flat);
  } else {
    // Rol sin login o cuenta fallida → record flat en tenant (sin pin de acceso)
    const empRef = push(tenantRef('employees'));
    empId = empRef.key;
    await set(empRef, {
      ...employee,
      profile: {
        name: employee.name,
        email: employee.email,
        active: employee.status !== 'inactive',
        createdAt: employee.createdAt,
      },
      branches: { [branchId]: true },
      homeBranch: branchId,
      firebaseUid: null,
    });
  }

  // Auto-create driver record for delivery role
  let driverWarning = null;
  if (employee.role === 'delivery' && employee.email) {
    const driverResult = await deliveryService.createDriver(branchId, {
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      vehicle: data.vehicle || 'Moto',
      userId: userId || undefined,
    });
    if (!driverResult.success) {
      driverWarning = 'Empleado creado, pero no se pudo crear el registro de repartidor automáticamente. Podés crearlo manualmente desde Admin > Delivery.';
    }
  }

  return { id: empId, ...employee, userId, _userWarning: userWarning, _driverWarning: driverWarning };
}

export async function updateEmployee(branchId, employeeId, data) {
  const updates = { ...data, updatedAt: nowISO() };
  // Don't allow overwriting id or createdAt
  delete updates.id;
  delete updates.createdAt;

  // Tenant-first: el id del listado es el tenant key (userId)
  const tenantSnap = await get(tenantRef(`employees/${employeeId}`));
  if (tenantSnap.exists()) {
    // Sync de cuenta (updateUser normaliza a profile/name|email|active, role, status...)
    const userData = {};
    for (const k of ['name', 'email', 'role', 'pin', 'status', 'statusEnd', 'active']) {
      if (updates[k] !== undefined) userData[k] = updates[k];
    }
    if (Object.keys(userData).length > 0) {
      await updateUser(employeeId, userData);
    }
    // Campos flat del formulario admin (phone, docType, área...)
    const flat = {};
    for (const k of ['phone', 'docType', 'docNum', 'area', 'station', 'startDate', 'hourlyRate', 'notes', 'status', 'statusEnd']) {
      if (updates[k] !== undefined) flat[k] = updates[k];
    }
    if (Object.keys(flat).length > 0) {
      await update(tenantRef(`employees/${employeeId}`), flat);
    }
    return updates;
  }

  // Legacy branch (empleado sin cuenta)
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
 * Migra el record flat de tenant al shape de cuenta (pinHash + pin_lookup).
 */
export async function createUserForEmployee(branchId, employeeId) {
  const snap = await get(tenantRef(`employees/${employeeId}`));
  const emp = snap.val();
  if (!emp) return { success: false, error: 'Empleado no encontrado' };
  const p = emp.profile || {};
  const email = p.email || emp.email;
  const name = p.name || emp.name;
  if (email && !ROLES_WITH_LOGIN.includes(emp.role)) return { success: false, error: `El rol ${emp.role} no requiere acceso al sistema.` };
  if (!email) return { success: false, error: 'El empleado no tiene email. Asignale un email primero.' };

  const userResult = await createUser({
    email,
    name,
    role: emp.role,
    pin: emp.pin || p.pin || '',
    branchIds: { [branchId]: true },
  });

  if (!userResult.success) {
    return { success: false, error: userResult.error || 'Error al crear el usuario. Revisá que el email no esté ya registrado.' };
  }

  // Mover los datos flat del record viejo al nuevo record de cuenta
  const userId = userResult.userId;
  if (userId !== employeeId) {
    const flat = {};
    for (const k of ['phone', 'docType', 'docNum', 'area', 'station', 'startDate', 'hourlyRate', 'notes', 'status', 'statusEnd']) {
      if (emp[k] !== undefined) flat[k] = emp[k];
    }
    if (Object.keys(flat).length > 0) {
      await update(tenantRef(`employees/${userId}`), flat);
    }
    await remove(tenantRef(`employees/${employeeId}`));
  }

  return { success: true, userId };
}

export async function deleteEmployee(branchId, employeeId, actorRole) {
  // Tenant-first: el id del listado es el tenant key
  const tenantSnap = await get(tenantRef(`employees/${employeeId}`));
  if (tenantSnap.exists()) {
    // deleteUser borra tenant record + global + role caches (con protecciones admin/superadmin)
    const userResult = await deleteUser(employeeId, 'system', actorRole);
    if (!userResult.success) return userResult;
    // Limpiar el branch legacy linkeado del modelo viejo (si existía)
    const branchSnap = await get(employeesRef(branchId));
    const branchEmps = branchSnap.val();
    if (branchEmps) {
      for (const [pushId, rec] of Object.entries(branchEmps)) {
        if (rec?.userId === employeeId) {
          await remove(employeeRef(branchId, pushId));
          break;
        }
      }
    }
    return userResult;
  }

  // Legacy branch (empleado sin cuenta)
  const snap = await get(employeeRef(branchId, employeeId));
  const emp = snap.val();
  const userId = emp?.userId;

  let userResult = { success: true };
  if (userId) {
    userResult = await deleteUser(userId, 'system', actorRole);
  }
  if (!userResult.success) return userResult;

  await remove(employeeRef(branchId, employeeId));
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

function mergeWeek(saved) {
  return DAYS.map(d => ({ day: d, start: '', end: '', active: false, station: '', ...(saved?.[d] || {}) }));
}

export async function getSchedule(branchId, employeeId) {
  // Tenant-first: los empleados con cuenta tienen su schedule en el tenant record
  const tenantSnap = await get(tenantRef(`employees/${employeeId}`));
  if (tenantSnap.exists()) {
    const saved = tenantSnap.val().schedule;
    if (!saved) return mergeWeek(null);
    return mergeWeek(saved);
  }
  const snap = await get(scheduleRef(branchId, employeeId));
  if (!snap.exists()) return mergeWeek(null);
  return mergeWeek(snap.val());
}

export async function saveSchedule(branchId, employeeId, weekData, userId) {
  // weekData is array of { day, start, end, active, station }
  const obj = {};
  for (const entry of weekData) {
    if (entry.active && entry.start && entry.end) {
      obj[entry.day] = { start: entry.start, end: entry.end, active: true, station: entry.station || '' };
    } else {
      obj[entry.day] = { start: '', end: '', active: false, station: '' };
    }
  }
  // Tenant-first: empleado con cuenta → schedule SOLO en tenant (evita branch skeleton duplicado)
  const tenantSnap = await get(tenantRef(`employees/${employeeId}`));
  if (tenantSnap.exists()) {
    await set(tenantRef(`employees/${employeeId}/schedule`), obj);
    return;
  }
  // Legacy: branch path (admin reads from here) + sync tenant cuando hay cuenta
  await set(scheduleRef(branchId, employeeId), obj);
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
 * Subscribe to one employee's attendance for today (tenant-level).
 * Used by the employee portal (turns real-time).
 */
export function subscribeEmployeeTodayAttendance(userId, callback) {
  if (!userId) {
    callback(null);
    return () => {};
  }
  const today = todayISO();
  return onValue(tenantRef(`employees/${userId}/attendance/${today}`), (snap) => {
    const data = snap.val();
    if (!data) { callback(null); return; }
    callback({ date: today, ...data });
  });
}

/**
 * Subscribe to one employee's full attendance history (tenant-level).
 */
export function subscribeEmployeeAttendanceHistory(userId, callback) {
  if (!userId) {
    callback([]);
    return () => {};
  }
  return onValue(tenantRef(`employees/${userId}/attendance`), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    const records = Object.entries(data).map(([date, record]) => ({ date, ...record }));
    records.sort((a, b) => (b.clockIn || 0) - (a.clockIn || 0));
    callback(records);
  });
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
  // Tenant-first: empleados aprobados vía aplicación no tienen branch record
  let empSnap = await get(employeeRef(branchId, employeeId));
  let empData = empSnap.val();
  if (!empData) {
    const tenantSnap = await get(tenantRef(`employees/${employeeId}`));
    empData = tenantSnap.exists() ? tenantSnap.val() : null;
  }
  const empStatus = empData?.status || (empData?.active !== false && empData?.profile?.active !== false ? 'active' : 'inactive');
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

  const attRef = tenantRef(`employees/${userId}/attendance`);
  const q = query(attRef, orderByKey(), limitToLast(daysBack));
  const snap = await get(q);
  if (!snap.exists()) return [];

  return Object.entries(snap.val())
    .map(([date, record]) => ({ date, ...record }))
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

// Unified: goals live under tenants/{tenant}/employees/{userId}/goals.
// Tenant-first: si el id ES un tenant employee (clave = userId) no hace falta el puente branch.
// ponytail: empleados legacy sin cuenta conservan el path branch (invisibles al portal).
async function goalsBasePath(branchId, employeeId) {
  const tenantSnap = await get(tenantRef(`employees/${employeeId}`));
  if (tenantSnap.exists()) return tenantPath(`employees/${employeeId}/goals`);
  const empSnap = await get(employeeRef(branchId, employeeId));
  const userId = empSnap.val()?.userId;
  if (userId) return tenantPath(`employees/${userId}/goals`);
  return `branches/${branchId}/employees/${employeeId}/goals`;
}

export async function getGoals(branchId, employeeId) {
  const snap = await get(ref(db, await goalsBasePath(branchId, employeeId)));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, g]) => ({ id, ...g }));
}

export async function setGoal(branchId, employeeId, goal) {
  const base = await goalsBasePath(branchId, employeeId);
  const gRef = goal.id ? ref(db, `${base}/${goal.id}`) : push(ref(db, base));
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
  await remove(ref(db, `${await goalsBasePath(branchId, employeeId)}/${goalId}`));
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
