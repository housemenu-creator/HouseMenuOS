import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

const DEFAULT_TENANT = 'default';

let currentTenantId = DEFAULT_TENANT;

export function setTenantId(id) {
  currentTenantId = id || DEFAULT_TENANT;
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
