import { ref, push, set, update, remove, get, onChildAdded, onChildChanged, onChildRemoved } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { normalizeFirebaseData } from './normalizeFirebaseData';
import { cuentasPath } from './paths';

function subscribeDelta(path, { onAdd, onChange, onRemove }) {
  const dbRef = ref(db, path);
  const handlers = [];

  if (onAdd) {
    const unsub = onChildAdded(dbRef, (snap) => {
      const data = snap.val();
      if (data !== null) {
        onAdd({ id: snap.key, ...normalizeFirebaseData(data) });
      }
    });
    handlers.push(unsub);
  }

  if (onChange) {
    const unsub = onChildChanged(dbRef, (snap) => {
      const data = snap.val();
      if (data !== null) {
        onChange({ id: snap.key, ...normalizeFirebaseData(data) });
      }
    });
    handlers.push(unsub);
  }

  if (onRemove) {
    const unsub = onChildRemoved(dbRef, (snap) => {
      onRemove(snap.key);
    });
    handlers.push(unsub);
  }

  return () => {
    handlers.forEach((unsub) => unsub());
  };
}

function withTimestamp(data) {
  return { ...data, updatedAt: Date.now() };
}

async function createEntity(path, data) {
  const dbRef = ref(db, path);
  const newRef = push(dbRef);
  const entity = {
    ...data,
    id: newRef.key,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await set(newRef, entity);
  return newRef.key;
}

async function updateEntity(path, id, data) {
  const dbRef = ref(db, `${path}/${id}`);
  await update(dbRef, withTimestamp(data));
}

async function deleteEntity(path, id) {
  const dbRef = ref(db, `${path}/${id}`);
  await remove(dbRef);
}

async function getEntity(path, id) {
  const dbRef = ref(db, `${path}/${id}`);
  const snap = await get(dbRef);
  if (snap.exists()) {
    return { id: snap.key, ...normalizeFirebaseData(snap.val()) };
  }
  return null;
}

export const cuentaService = {
  subscribeCuentas(branchId, { onAdd, onChange, onRemove }) {
    return subscribeDelta(cuentasPath(branchId), { onAdd, onChange, onRemove });
  },

  async createCuenta(branchId, data) {
    return createEntity(cuentasPath(branchId), data);
  },

  async updateCuenta(branchId, id, data) {
    await updateEntity(cuentasPath(branchId), id, data);
  },

  async deleteCuenta(branchId, id) {
    await deleteEntity(cuentasPath(branchId), id);
  },

  async getCuenta(branchId, id) {
    return getEntity(cuentasPath(branchId), id);
  },

  async markCuentaInactive(branchId, id) {
    await updateEntity(cuentasPath(branchId), id, {
      status: 'inactiva',
      isActive: false,
    });
  },

  async updateCreditUsed(branchId, id, amount) {
    const dbRef = ref(db, cuentasPath(branchId, id) + '/creditUsed');
    await update(dbRef, { '.sv': { 'increment': amount } });
  },
};
