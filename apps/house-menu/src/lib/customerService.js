import { ref, get, set, push, update, runTransaction, onValue, serverTimestamp } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

const CUSTOMERS_PATH = 'customers';

const REFERRAL_CODE_KEY = 'cm_pending_ref_code';

/** Matching server-side tier thresholds */
function computeTier(totalSpent) {
  const spent = totalSpent || 0;
  if (spent >= 5000) return 'platinum';
  if (spent >= 2000) return 'gold';
  if (spent >= 500) return 'silver';
  return 'bronze';
}

/** Genera un código de referido único desde un id */
export function generateReferralCode(id) {
  if (!id) return '';
  const short = id.slice(0, 6).toUpperCase();
  return `HOUSE-${short}`;
}

/** Lee código de referido pendiente desde localStorage */
export function getPendingReferralCode() {
  try {
    return localStorage.getItem(REFERRAL_CODE_KEY) || '';
  } catch {
    return '';
  }
}

/** Guarda código de referido pendiente en localStorage */
export function setPendingReferralCode(code) {
  if (!code) { clearPendingReferralCode(); return; }
  try { localStorage.setItem(REFERRAL_CODE_KEY, code); } catch {}
}

/** Limpia código de referido pendiente */
export function clearPendingReferralCode() {
  try { localStorage.removeItem(REFERRAL_CODE_KEY); } catch {}
}

/** Captura código de referido desde la URL (?ref=CODE) y lo guarda en localStorage */
export function captureReferralFromURL() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) setPendingReferralCode(ref.toUpperCase());
}

/**
 * Encuentra un cliente por email, phone, o crea uno nuevo.
 * La búsqueda prioriza uid > email > phone.
 * @param {Object} opts
 * @param {string} [opts.uid] - Firebase Auth UID (registered customer)
 * @param {string} [opts.email]
 * @param {string} [opts.phone]
 * @param {string} [opts.name]
 * @param {string} [opts.branchId]
 * @param {number} [opts.orderTotal]
 * @param {number} [opts.pointsEarned]
 * @param {string} [opts.referredBy] - Código de referido de quien invitó
 */
export async function findOrCreateCustomer({ uid, email, phone, name, branchId, orderTotal, pointsEarned, referredBy }) {
  // 0. If uid is provided, use it directly (registered customer)
  if (uid) {
    const snap = await get(ref(db, `${CUSTOMERS_PATH}/${uid}`));
    const existing = snap.val();
    if (existing) {
      const newOrderCount = (existing.orderCount || 0) + 1;
      const newTotalSpent = (existing.totalSpent || 0) + (orderTotal || 0);
      const updates = {
        lastOrderAt: serverTimestamp(),
        orderCount: newOrderCount,
        totalSpent: newTotalSpent,
        avgTicket: newOrderCount > 0 ? newTotalSpent / newOrderCount : 0,
        tier: computeTier(newTotalSpent),
        referralCode: existing.referralCode || generateReferralCode(uid),
        ...(pointsEarned ? {
          points: (existing.points || 0) + pointsEarned,
          lifetimePoints: (existing.lifetimePoints || 0) + pointsEarned,
        } : {}),
      };
      await update(ref(db, `${CUSTOMERS_PATH}/${uid}`), updates);
      return { id: uid, ...existing, ...updates };
    }
    // Create new with uid
    const referralCode = generateReferralCode(uid);
    const customer = {
      name: name || '',
      phone: phone || '',
      email: email || '',
      createdAt: serverTimestamp(),
      lastOrderAt: serverTimestamp(),
      orderCount: 1,
      totalSpent: orderTotal || 0,
      avgTicket: orderTotal || 0,
      tier: computeTier(orderTotal || 0),
      referralCode,
      referredBy: referredBy || null,
      referralsCount: 0,
      referralBonusEarned: 0,
      points: pointsEarned || 0,
      lifetimePoints: pointsEarned || 0,
      redeemedPoints: 0,
      preferences: { push: true, email: true, promos: true },
    };
    await set(ref(db, `${CUSTOMERS_PATH}/${uid}`), customer);
    await set(ref(db, `referralCodes/${referralCode}`), { uid, createdAt: Date.now() });
    return { id: uid, ...customer };
  }

  // 1. Buscar por email (legacy push-key customers)
  if (email) {
    const snap = await get(ref(db, `${CUSTOMERS_PATH}`));
    const all = snap.val();
    if (all) {
      for (const [id, c] of Object.entries(all)) {
        if (c.email && c.email.toLowerCase() === email.toLowerCase()) {
          const newOrderCount = (c.orderCount || 0) + 1;
          const newTotalSpent = (c.totalSpent || 0) + (orderTotal || 0);
          const updates = {
            name: name || c.name,
            phone: phone || c.phone,
            lastOrderAt: serverTimestamp(),
            orderCount: newOrderCount,
            totalSpent: newTotalSpent,
            avgTicket: newOrderCount > 0 ? newTotalSpent / newOrderCount : 0,
            tier: computeTier(newTotalSpent),
            referralCode: c.referralCode || generateReferralCode(id),
            ...(pointsEarned ? { points: (c.points || 0) + pointsEarned, lifetimePoints: (c.lifetimePoints || 0) + pointsEarned } : {}),
          };
          await update(ref(db, `${CUSTOMERS_PATH}/${id}`), updates);
          return { id, ...c, ...updates };
        }
      }
    }
  }

  // 2. Buscar por phone
  if (phone) {
    const snap = await get(ref(db, `${CUSTOMERS_PATH}`));
    const all = snap.val();
    if (all) {
      for (const [id, c] of Object.entries(all)) {
        if (c.phone === phone) {
          const mergedEmail = c.email ? c.email : email;
          const newOrderCount = (c.orderCount || 0) + 1;
          const newTotalSpent = (c.totalSpent || 0) + (orderTotal || 0);
          const updates = {
            name: name || c.name,
            email: mergedEmail,
            lastOrderAt: serverTimestamp(),
            orderCount: newOrderCount,
            totalSpent: newTotalSpent,
            avgTicket: newOrderCount > 0 ? newTotalSpent / newOrderCount : 0,
            tier: computeTier(newTotalSpent),
            referralCode: c.referralCode || generateReferralCode(id),
            ...(pointsEarned ? { points: (c.points || 0) + pointsEarned, lifetimePoints: (c.lifetimePoints || 0) + pointsEarned } : {}),
          };
          await update(ref(db, `${CUSTOMERS_PATH}/${id}`), updates);
          return { id, ...c, ...updates };
        }
      }
    }
  }

  // 3. Crear nuevo (push-key, anonymous customer)
  const newRef = push(ref(db, CUSTOMERS_PATH));
  const newId = newRef.key;
  const referralCode = generateReferralCode(newId);
  const customer = {
    name: name || '',
    phone: phone || '',
    email: email || '',
    createdAt: serverTimestamp(),
    lastOrderAt: serverTimestamp(),
    orderCount: 1,
    totalSpent: orderTotal || 0,
    avgTicket: orderTotal || 0,
    tier: computeTier(orderTotal || 0),
    referralCode,
    referredBy: referredBy || null,
    referralsCount: 0,
    referralBonusEarned: 0,
    points: pointsEarned || 0,
    lifetimePoints: pointsEarned || 0,
    redeemedPoints: 0,
  };
  await set(newRef, customer);
  return { id: newId, ...customer };
}

/** Agrega puntos a un cliente (falla silenciosamente si no hay permisos) */
export async function addCustomerPoints(customerId, points) {
  if (!customerId || !points) return;
  const ref_ = ref(db, `${CUSTOMERS_PATH}/${customerId}/points`);
  try {
    await runTransaction(ref_, (current) => (current || 0) + points);
  } catch (e) {
    if (e.code === 'PERMISSION_DENIED' || e.message?.includes('permission_denied')) {
      console.warn('addCustomerPoints skipped (permission_denied)');
      return;
    }
    throw e;
  }
}

/** Puntos disponibles de un cliente */
export async function getCustomerPoints(customerId) {
  const snap = await get(ref(db, `${CUSTOMERS_PATH}/${customerId}/points`));
  return snap.val() || 0;
}

/** Canjear puntos (devuelve el nuevo saldo) */
export async function redeemPoints(customerId, pointsToRedeem) {
  const ref_ = ref(db, `${CUSTOMERS_PATH}/${customerId}/points`);
  let newBalance = 0;
  await runTransaction(ref_, (current) => {
    const balance = current || 0;
    if (balance < pointsToRedeem) return; // aborta si no alcanza
    newBalance = balance - pointsToRedeem;
    return newBalance;
  });
  return newBalance;
}

/** Suscribe a todos los clientes */
export function subscribeCustomers(callback) {
  return onValue(ref(db, CUSTOMERS_PATH), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, c]) => ({ id, ...c })));
  });
}

/** Obtiene el historial de pedidos de un cliente desde orders */
export async function getCustomerOrders(branchOrders, customerEmail, customerPhone) {
  if (!branchOrders?.length) return [];
  return branchOrders
    .filter(o => {
      if (customerEmail) return o.customerEmail === customerEmail;
      if (customerPhone) return o.customerPhone === customerPhone;
      return false;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Busca pedidos de un cliente por email en TODAS las sucursales.
 * Retorna { customer, orders: [{ branchId, branchName, ...order }] }
 */
export async function findCustomerAndOrders(email) {
  if (!email) return null;

  // 1. Find customer
  const snap = await get(ref(db, CUSTOMERS_PATH));
  const all = snap.val();
  let customer = null;
  if (all) {
    for (const [id, c] of Object.entries(all)) {
      if (c.email && c.email.toLowerCase() === email.toLowerCase()) {
        customer = { id, ...c };
        break;
      }
    }
  }
  if (!customer) return { customer: null, orders: [] };

  // 2. Get all branches
  const branchesSnap = await get(ref(db, 'branches'));
  const branches = branchesSnap.val();
  if (!branches) return { customer, orders: [] };

  // 3. Find orders matching email in each branch
  const orders = [];
  for (const [branchId, branchData] of Object.entries(branches)) {
    const branchName = branchData.name || branchId;
    const ordersSnap = await get(ref(db, `branches/${branchId}/orders`));
    const branchOrders = ordersSnap.val();
    if (!branchOrders) continue;
    for (const [orderId, order] of Object.entries(branchOrders)) {
      if (order.customerEmail && order.customerEmail.toLowerCase() === email.toLowerCase()) {
        orders.push({
          ...order,
          id: orderId,
          branchId,
          branchName,
        });
      }
    }
  }

  // 4. Sort by date descending
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { customer, orders };
}

/**
 * Re-order: guarda items en localStorage y navega a la carta.
 */
export function prepareReorder(items) {
  if (!items?.length) return;
  const clean = items.map(({ id, name, price, quantity, details, productId, categoryId }) => ({
    productId: productId || id,
    name,
    price,
    quantity: quantity || 1,
    details: details || [],
    categoryId: categoryId || '',
  }));
  localStorage.setItem('cm_reorder_items', JSON.stringify(clean));
}

/** Filtra clientes por criterios desde RTDB (batch read) */
export async function getCustomersBySegment({ tier, minSpent, maxSpent, minOrders, recencyDays } = {}) {
  const snap = await get(ref(db, CUSTOMERS_PATH));
  const all = snap.val();
  if (!all) return [];

  const now = Date.now();
  return Object.entries(all)
    .map(([id, c]) => ({ id, ...c }))
    .filter((c) => {
      if (tier && c.tier !== tier) return false;
      if (minSpent != null && (c.totalSpent || 0) < minSpent) return false;
      if (maxSpent != null && (c.totalSpent || 0) > maxSpent) return false;
      if (minOrders != null && (c.orderCount || 0) < minOrders) return false;
      if (recencyDays != null) {
        if (!c.lastOrderAt) return true;
        const daysSince = Math.floor((now - new Date(c.lastOrderAt).getTime()) / 86400000);
        if (daysSince < recencyDays) return false;
      }
      return true;
    });
}

/** Agrega puntos en lote a múltiples clientes */
export async function addPointsBatch(updates) {
  const results = { success: 0, failed: 0, errors: [] };
  for (const { customerId, points } of updates) {
    try {
      await addCustomerPoints(customerId, points);
      results.success++;
    } catch (e) {
      results.failed++;
      results.errors.push(`${customerId}: ${e.message}`);
    }
  }
  return results;
}
