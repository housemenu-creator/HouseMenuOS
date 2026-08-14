import { ref, get, set, update, onValue } from 'firebase/database';
import { realtimeDB as db, auth } from '@house/db';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { hashPin, pinLookupKey } from './crypto';
import { nowISO } from './format';
import { auditLog } from './auditService';
import { getTenantId } from './tenantService';

// Tenant activo: resuelto por TenantResolver (slug) o fallback dev 'default'.
function T() {
  return getTenantId() || 'default';
}

/**
 * Registro de trabajadores con aprobación del admin.
 * El trabajador crea su cuenta Auth + datos + DNI/CV → queda "pending".
 * El admin aprueba (asigna rol, PIN, sucursal, horario) o rechaza.
 */

// ── Storage paths ──
function appFilePaths(uid) {
  return {
    dni: `applications/${uid}/dni`,
    cv: `applications/${uid}/cv`,
  };
}

async function uploadAppFile(uid, kind, file) {
  if (!file) return null;
  const storage = getStorage();
  const fileRef = storageRef(storage, appFilePaths(uid)[kind]);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

/**
 * Crea la cuenta Auth + aplicación pendiente con DNI/CV.
 * Retorna { success, error? , requiresAccount? } — si la cuenta ya existe se marca.
 */
export async function submitApplication({ email, password, name, dni, phone, address, birthDate, dniFile, cvFile }) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;

    const [dniUrl, cvUrl] = await Promise.all([
      uploadAppFile(uid, 'dni', dniFile),
      uploadAppFile(uid, 'cv', cvFile),
    ]);

    const now = nowISO();
    await set(ref(db, `tenants/${T()}/applications/${uid}`), {
      status: 'pending',
      profile: {
        name,
        email,
        dni,
        phone,
        address,
        birthDate,
        createdAt: now,
      },
      files: { dni: dniUrl || null, cv: cvUrl || null },
      createdAt: now,
    });

    auditLog('application.submitted', { userId: uid, email, name }, uid);
    return { success: true, uid };
  } catch (err) {
    console.error('applicationsService.submitApplication error:', err);
    if (err?.code === 'auth/email-already-in-use') {
      return { success: false, error: 'Ese correo ya está registrado. Probá iniciar sesión o usá otro correo.' };
    }
    return { success: false, error: err?.message || 'No se pudo enviar la solicitud. Intentá de nuevo.' };
  }
}

/** Escucha todas las solicitudes (admin). */
export function subscribeApplications(callback) {
  const appRef = ref(db, `tenants/${T()}/applications`);
  return onValue(appRef, (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val).map(([uid, app]) => ({ id: uid, ...app }));
    // pendientes primero, luego por fecha
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
    callback(list);
  });
}

/** Aprueba una solicitud: crea empleado + PIN + índices, marca la app como aprobada. */
export async function approveApplication({ applicationId, name, email, dni, phone, role, pin, branchIds, schedule, functions, actor }) {
  const tenantAppRef = ref(db, `tenants/${T()}/applications/${applicationId}`);
  const appSnap = await get(tenantAppRef);
  const app = appSnap.val();
  if (!app) return { success: false, error: 'La solicitud ya no existe.' };
  if (app.status !== 'pending') return { success: false, error: `La solicitud ya fue ${app.status}.` };

  if (!/^\d{4,6}$/.test(pin)) return { success: false, error: 'El PIN debe tener 4 a 6 dígitos.' };

  const uid = applicationId; // el uid de Auth del solicitante ES la key
  const now = nowISO();
  const pinHash = await hashPin(pin);
  const lookup = await pinLookupKey(pin);
  const targetBranches = branchIds || { monteverde: true };
  const homeBranch = Object.keys(targetBranches)[0] || null;

  const employee = {
    profile: {
      name,
      email,
      dni,
      phone,
      pinHash,
      pinLookupKey: lookup,
      active: true,
      createdAt: now,
      functions: functions || [],
    },
    role,
    branches: targetBranches,
    homeBranch,
    firebaseUid: uid,
  };
  if (schedule) employee.schedule = schedule;

  const encodedEmail = email.replace(/\./g, ',');

  await update(ref(db), {
    [`tenants/${T()}/employees/${uid}`]: employee,
    [`tenants/${T()}/pin_lookup/${lookup}`]: uid,
    [`global/emails_to_uid/${encodedEmail}`]: uid,
    [`global/users/${uid}/profile`]: { name, email, updatedAt: now },
    [`global/users/${uid}/memberships/${T()}`]: { role, joinedAt: now, active: true },
    // role cache por sucursal
    ...Object.fromEntries(Object.keys(targetBranches).map((b) => [`branches/${b}/_role_cache/${uid}`, role])),
    // la app queda aprobada (se conserva para historial fino; se muestra filtrada)
    [`tenants/${T()}/applications/${uid}/status`]: 'approved',
    [`tenants/${T()}/applications/${uid}/approvedAt`]: now,
    [`tenants/${T()}/applications/${uid}/assigned`]: { role, pin, branchIds: targetBranches, functions: functions || [] },
  });

  auditLog('application.approved', { userId: uid, email, name, role }, actor || 'admin');
  return { success: true, userId: uid };
}

/** Rechaza una solicitud: marca rejected y borra los archivos subidos (la cuenta Auth queda para que la gestione el admin manualmente — no hay Admin SDK). */
export async function rejectApplication(applicationId, reason, actor) {
  const appRef = ref(db, `tenants/${T()}/applications/${applicationId}`);
  const appSnap = await get(appRef);
  const app = appSnap.val();
  if (!app) return { success: false, error: 'La solicitud ya no existe.' };

  await update(ref(db), {
    [`tenants/${T()}/applications/${applicationId}/status`]: 'rejected',
    [`tenants/${T()}/applications/${applicationId}/rejectedAt`]: nowISO(),
    [`tenants/${T()}/applications/${applicationId}/rejectReason`]: reason || '',
  });

  // Intentar borrar la cuenta Auth (puede fallar si se deslogueó ya)
  try {
    const storage = getStorage();
    const paths = appFilePaths(applicationId);
    for (const p of Object.values(paths)) {
      try { await deleteObject(storageRef(storage, p)); } catch { /* noop */ }
    }
  } catch { /* noop */ }

  auditLog('application.rejected', { userId: applicationId, email: app.profile?.email, reason }, actor || 'admin');
  return { success: true };
}