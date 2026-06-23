import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

const DEFAULT_TENANT = 'default';
const STORAGE_KEY = 'house_tenant_id';

function loadTenantId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_TENANT;
  } catch {
    return DEFAULT_TENANT;
  }
}

let currentTenantId = loadTenantId();

export function setTenantId(id) {
  currentTenantId = id || DEFAULT_TENANT;
  try {
    localStorage.setItem(STORAGE_KEY, currentTenantId);
  } catch {
    // localStorage not available — use in-memory only
  }
}

export function getTenantId() {
  return currentTenantId;
}

export function tenantRef(path) {
  return ref(db, `tenants/${currentTenantId}/${path}`);
}

export function tenantPath(path) {
  return `tenants/${currentTenantId}/${path}`;
}

export function subscribeTenant(path, callback) {
  const dbRef = tenantRef(path);
  return onValue(dbRef, (snap) => {
    callback(snap.val());
  });
}
