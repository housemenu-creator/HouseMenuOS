import { ref, get, set, update, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { nowISO } from './format';

const LOG = (branchId) => `branches/${branchId}/logistics`;

export async function setIngredientPrice(branchId, ingredientId, supplierId, cost, { poId, note } = {}) {
  const priceRef = ref(db, `${LOG(branchId)}/prices/${ingredientId}/${supplierId}`);
  const existing = await get(priceRef);
  const prev = existing.val();
  const historyEntry = { cost: Number(cost), date: nowISO(), poId: poId || null, note: note || '' };

  const data = {
    cost: Number(cost),
    updatedAt: nowISO(),
    history: prev ? [...(prev.history || []), historyEntry] : [historyEntry],
  };
  await set(priceRef, data);

  // Update ingredient cost if this supplier is the current one
  const ingRef = ref(db, `${LOG(branchId)}/ingredients/${ingredientId}`);
  const ingSnap = await get(ingRef);
  const ing = ingSnap.val();
  if (ing && (ing.supplierIds?.includes(supplierId) || ing.supplierId === supplierId)) {
    await update(ingRef, { cost: Number(cost), updatedAt: nowISO() });
  }

  return { success: true };
}

export async function getIngredientPrice(branchId, ingredientId, supplierId) {
  const snap = await get(ref(db, `${LOG(branchId)}/prices/${ingredientId}/${supplierId}`));
  if (!snap.exists()) return null;
  return { id: snap.key, ...snap.val() };
}

export function subscribeIngredientPrices(branchId, ingredientId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/prices/${ingredientId}`), (snap) => {
    const data = snap.val();
    if (!data) { callback({}); return; }
    callback(data);
  });
}
