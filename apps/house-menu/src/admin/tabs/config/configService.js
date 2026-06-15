/**
 * Config Service — centralized Firebase data layer for system configuration.
 *
 * All reads/writes to tenants/default/config/, agent_tasks/, agent_audit/,
 * and aggregate DB stats go through this module.
 */

import { ref, get, set, update, push, child, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { tenantPath } from '../../../lib/tenantService';

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
      get(child(ref(db), 'branches/castilla/employees')),
    ]);
    return {
      customers: custSnap.exists() ? Object.keys(custSnap.val()).length : 0,
      branches: ordSnap.exists() ? Object.keys(ordSnap.val()).filter(k => k !== 'castilla' || true).length : 0,
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
