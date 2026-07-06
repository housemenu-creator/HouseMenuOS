/**
 * Config Service — centralized Firebase data layer for system configuration.
 *
 * All reads/writes to tenants/default/config/, agent_tasks/, agent_audit/,
 * and aggregate DB stats go through this module.
 */

import { ref, get, set, update, push, child, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { tenantPath, getTenantId } from '../../../lib/tenantService';
import { updateSlug } from '../../../lib/slugService';

// ── System Config ───────────────────────────────────────

const CONFIG_PATH = tenantPath('config');

export function subscribeConfig(callback) {
  const configRef = ref(db, CONFIG_PATH);
  return onValue(configRef, (snap) => {
    callback(snap.exists() ? snap.val() : {});
  }, (err) => {
    console.error('Config subscription error:', err);
    callback(null, err);
  });
}

export async function saveConfig(updates) {
  try {
    await update(ref(db, CONFIG_PATH), updates);
    return { success: true };
  } catch (err) {
    console.error('Error saving config:', err);
    return { success: false, error: err.message };
  }
}

// ── Agent Tasks ─────────────────────────────────────────

export function subscribeTasks(callback) {
  const tasksRef = ref(db, 'agent_tasks');
  return onValue(tasksRef, (snap) => {
    callback(snap.exists() ? snap.val() : {});
  }, (err) => {
    console.error('Tasks subscription error:', err);
    callback(null, err);
  });
}

export async function toggleTask(taskId, currentlyActive) {
  try {
    await update(child(ref(db), `agent_tasks/${taskId}`), { activa: !currentlyActive });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Audit Log ───────────────────────────────────────────

export function subscribeAudit(callback) {
  const auditRef = ref(db, 'agent_audit');
  return onValue(auditRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const entries = Object.entries(snap.val())
      .map(([id, entry]) => ({ id, ...entry }))
      .sort((a, b) => (b.ejecucion || 0) - (a.ejecucion || 0));
    callback(entries);
  }, (err) => {
    console.error('Audit subscription error:', err);
    callback(null, err);
  });
}

// ── DB Stats ────────────────────────────────────────────

export async function getDbStats() {
  try {
    const [custSnap, ordSnap, empSnap] = await Promise.all([
      get(child(ref(db), 'customers')),
      get(child(ref(db), 'branches')),
      get(child(ref(db), 'branches/monteverde/employees')),
    ]);
    return {
      customers: custSnap.exists() ? Object.keys(custSnap.val()).length : 0,
      branches: ordSnap.exists() ? Object.keys(ordSnap.val()).filter(k => k !== 'monteverde' || true).length : 0,
      employees: empSnap.exists() ? Object.keys(empSnap.val()).length : 0,
    };
  } catch (err) {
    console.error('Error loading DB stats:', err);
    return null;
  }
}

// ── Data Export ─────────────────────────────────────────

export async function exportCollection(type) {
  const path = type === 'customers' ? 'customers' : 'agent_audit';
  const snap = await get(child(ref(db), path));
  if (!snap.exists()) return null;
  return Object.values(snap.val());
}

// ── Backup / Restore ─────────────────────────────────────

const BACKUP_COLLECTIONS = [
  { id: 'customers', label: 'Clientes', path: 'customers' },
  { id: 'audit', label: 'Auditoría', path: 'agent_audit' },
  { id: 'tasks', label: 'Tareas de agente', path: 'agent_tasks' },
];

async function readCollection(path) {
  const snap = await get(child(ref(db), path));
  if (!snap.exists()) return {};
  return snap.val();
}

async function writeCollection(path, data) {
  await set(ref(db, path), data);
}

/**
 * Exporta todas las colecciones como un objeto JSON para backup.
 */
export async function backupAll() {
  const result = {};
  for (const col of BACKUP_COLLECTIONS) {
    try {
      result[col.id] = await readCollection(col.path);
    } catch (err) {
      result[col.id] = { _error: err.message };
    }
  }
  return result;
}

/**
 * Restaura una colección desde datos JSON.
 * Si merge es true, hace merge en lugar de reemplazar.
 */
export async function restoreCollection(collectionId, data, merge = false) {
  const col = BACKUP_COLLECTIONS.find(c => c.id === collectionId);
  if (!col) throw new Error(`Colección desconocida: ${collectionId}`);

  if (merge) {
    const existing = await readCollection(col.path);
    await writeCollection(col.path, { ...existing, ...data });
  } else {
    await writeCollection(col.path, data);
  }
  return { success: true, collection: col.label };
}

/**
 * Restaura todas las colecciones desde un backup completo.
 */
export async function restoreAll(backupData, merge = false) {
  const results = [];
  for (const col of BACKUP_COLLECTIONS) {
    if (backupData[col.id] && !backupData[col.id]._error) {
      try {
        await restoreCollection(col.id, backupData[col.id], merge);
        results.push({ id: col.id, status: 'ok' });
      } catch (err) {
        results.push({ id: col.id, status: 'error', error: err.message });
      }
    }
  }
  return results;
}

export function getBackupCollections() {
  return BACKUP_COLLECTIONS;
}
