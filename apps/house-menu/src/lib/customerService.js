import { ref, get, set, push, update, runTransaction, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { nowISO } from './format';

const CUSTOMERS_PATH = 'customers';

/**
 * Encuentra un cliente por email, phone, o crea uno nuevo.
 * La búsqueda prioriza email > phone.
 */
export async function findOrCreateCustomer({ email, phone, name, branchId, orderTotal }) {
  // 1. Buscar por email
  if (email) {
    const snap = await get(ref(db, `${CUSTOMERS_PATH}`));
    const all = snap.val();
    if (all) {
      for (const [id, c] of Object.entries(all)) {
        if (c.email && c.email.toLowerCase() === email.toLowerCase()) {
          // Actualizar datos
          await update(ref(db, `${CUSTOMERS_PATH}/${id}`), {
            name: name || c.name,
            phone: phone || c.phone,
            lastOrderAt: nowISO(),
            orderCount: (c.orderCount || 0) + 1,
            totalSpent: (c.totalSpent || 0) + (orderTotal || 0),
          });
          return { id, ...c, name: name || c.name, phone: phone || c.phone };
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
          // When matching by phone, don't overwrite existing customer's email
          const mergedEmail = c.email ? c.email : email;
          await update(ref(db, `${CUSTOMERS_PATH}/${id}`), {
            name: name || c.name,
            email: mergedEmail,
            lastOrderAt: nowISO(),
            orderCount: (c.orderCount || 0) + 1,
            totalSpent: (c.totalSpent || 0) + (orderTotal || 0),
          });
          return { id, ...c, name: name || c.name, email: mergedEmail };
        }
      }
    }
  }

  // 3. Crear nuevo
  const newRef = push(ref(db, CUSTOMERS_PATH));
  const customer = {
    name: name || '',
    phone: phone || '',
    email: email || '',
    createdAt: nowISO(),
    lastOrderAt: nowISO(),
    orderCount: 1,
    totalSpent: orderTotal || 0,
    points: 0,
  };
  await set(newRef, customer);
  return { id: newRef.key, ...customer };
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
