/**
 * areaConfigService — Gestión de templates de áreas/estaciones/checklists.
 * Almacenado en branches/{branchId}/config/areas/{areaKey}.
 * El admin configura, los empleados ejecutan.
 */
import { ref, get, set, push, update, remove, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { branchConfigPath } from './paths';

function areasRef(branchId) {
  return ref(db, branchConfigPath(branchId, 'areas'));
}

function areaRef(branchId, areaKey) {
  return ref(db, branchConfigPath(branchId, `areas/${areaKey}`));
}

/**
 * Suscripción en tiempo real a todas las áreas configuradas.
 */
export function subscribeAreas(branchId, callback) {
  if (!branchId) { callback({}); return () => {}; }
  const unsub = onValue(areasRef(branchId), (snap) => {
    const data = snap.val();
    callback(data || {});
  });
  return unsub;
}

/**
 * Obtiene todas las áreas una sola vez.
 */
export async function getAreas(branchId) {
  if (!branchId) return {};
  const snap = await get(areasRef(branchId));
  return snap.val() || {};
}

/**
 * Crea un nuevo template de área.
 */
export async function createArea(branchId, areaData) {
  const newRef = push(areasRef(branchId));
  const areaKey = newRef.key;
  const area = {
    name: areaData.name || '',
    stations: areaData.stations || [],
    checklists: {
      inicio: areaData.checklists?.inicio || [],
      cierre: areaData.checklists?.cierre || [],
    },
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await set(newRef, area);
  return { success: true, areaKey };
}

/**
 * Actualiza un template de área.
 */
export async function updateArea(branchId, areaKey, areaData) {
  await update(areaRef(branchId, areaKey), { ...areaData, updatedAt: Date.now() });
  return { success: true };
}

/**
 * Elimina un template de área.
 */
export async function deleteArea(branchId, areaKey) {
  await remove(areaRef(branchId, areaKey));
  return { success: true };
}
