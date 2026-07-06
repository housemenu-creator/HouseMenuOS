import { ref, get, set, push, update, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

/** Path global de promociones para clientes (no por sucursal) */
const PROMOS_PATH = 'promotions';

/**
 * Suscribe a promociones activas para un segmento de cliente + branch.
 * @param {string} tier - bronze | silver | gold | platinum
 * @param {string} [branchId] - filtra por sucursal (opcional)
 * @param {(promos: Array) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeActivePromotions(tier, branchId, callback) {
  // Allow calling with (tier, callback) for backward compat
  if (typeof branchId === 'function') {
    callback = branchId;
    branchId = null;
  }

  const promosRef = ref(db, PROMOS_PATH);

  return onValue(promosRef, (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }

    const now = Date.now();
    const results = Object.entries(data)
      .map(([id, p]) => ({ id, ...p }))
      .filter((p) => {
        if (!p.active) return false;
        if (p.startsAt && now < p.startsAt) return false;
        if (p.endsAt && now > p.endsAt) return false;

        // Filtrar por sucursal si se especifica
        if (branchId && p.branchIds?.length > 0 && !p.branchIds.includes(branchId)) return false;

        // Matchear segmento
        const segment = p.targetSegment || 'all';
        if (segment === 'all') return true;
        if (segment === `tier:${tier}`) return true;
        if (segment === 'new_customers' && (p._forNewCustomers)) return true;

        return false;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    callback(results);
  });
}

/** Crea una promoción global */
export async function createPromotion(data) {
  const ref_ = push(ref(db, PROMOS_PATH));
  const promo = {
    title: data.title || '',
    description: data.description || '',
    type: data.type || 'bonus_points', // bonus_points | discount_percent | free_item
    value: Number(data.value) || 0,
    targetSegment: data.targetSegment || 'all',
    active: true,
    startsAt: data.startsAt ? new Date(data.startsAt).getTime() : Date.now(),
    endsAt: data.endsAt ? new Date(data.endsAt).getTime() : null,
    createdAt: Date.now(),
    imageUrl: data.imageUrl || '',
    terms: data.terms || '',
    branchIds: data.branchIds || [],
    productIds: data.productIds || [],
  };
  await set(ref_, promo);
  return { id: ref_.key, ...promo };
}

/** Actualiza una promoción */
export async function updatePromotion(id, data) {
  if (!id) return;
  await update(ref(db, `${PROMOS_PATH}/${id}`), data);
}

/** Elimina una promoción */
export async function deletePromotion(id) {
  if (!id) return;
  await set(ref(db, `${PROMOS_PATH}/${id}`), null);
}

/** Obtiene todas las promociones */
export async function getAllPromotions() {
  const snap = await get(ref(db, PROMOS_PATH));
  const data = snap.val();
  if (!data) return [];
  return Object.entries(data).map(([id, p]) => ({ id, ...p }));
}
