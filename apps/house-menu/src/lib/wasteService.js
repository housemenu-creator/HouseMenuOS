import { ref, push, set, update, get, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { nowISO } from './format';
import { registerMovement } from './logisticsService';
import { pub } from '@house/event-bus';

const LOG = (branchId) => `branches/${branchId}/logistics`;

export async function createWaste(branchId, data) {
  const ref_ = ref(db, `${LOG(branchId)}/waste`);
  const newRef = push(ref_);
  const waste = {
    ingredientId: data.ingredientId,
    ingredientName: data.ingredientName,
    quantity: Number(data.quantity),
    unit: data.unit,
    unitCost: Number(data.unitCost) || 0,
    totalCost: Number(data.quantity) * (Number(data.unitCost) || 0),
    reason: data.reason || '',
    requiresApproval: (Number(data.quantity) * (Number(data.unitCost) || 0)) > 50,
    approvedBy: null,
    approvedAt: null,
    createdBy: data.createdBy || 'system',
    createdAt: nowISO(),
  };
  await set(newRef, waste);

  if (!waste.requiresApproval) {
    await applyWaste(branchId, newRef.key, waste);
  }

  return { success: true, id: newRef.key };
}

async function applyWaste(branchId, wasteId, waste) {
  await registerMovement(branchId, {
    ingredientId: waste.ingredientId,
    type: 'salida',
    quantity: waste.quantity,
    unit: waste.unit,
    reason: `Merma: ${waste.reason}`,
    reference: `WASTE-${wasteId.slice(-6)}`,
    cost: waste.totalCost,
    createdBy: waste.createdBy || 'system',
  });

  try {
    await pub('inventory.waste', {
      wasteId, ingredientId: waste.ingredientId,
      quantity: waste.quantity, totalCost: waste.totalCost,
    }, { branchId, userEmail: waste.createdBy || 'system', userRole: 'admin' });
  } catch (e) {
    console.warn('[waste] Failed to publish event:', e.message);
  }
}

export async function approveWaste(branchId, wasteId, approvedBy) {
  const snap = await get(ref(db, `${LOG(branchId)}/waste/${wasteId}`));
  const waste = snap.val();
  if (!waste) return { success: false, error: 'Merma no encontrada' };

  await update(ref(db, `${LOG(branchId)}/waste/${wasteId}`), {
    approvedBy, approvedAt: nowISO(),
  });

  await applyWaste(branchId, wasteId, waste);
  return { success: true };
}

export function subscribeWaste(branchId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/waste`), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, w]) => ({ id, ...w }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  });
}
