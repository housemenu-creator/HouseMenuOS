import { initFirebase, ref, get, child } from "./firebase.js";
const db = initFirebase();

export async function getOrder(branchId: string, orderId: string) {
  const snapshot = await get(
    child(ref(db), `branches/${branchId}/orders/${orderId}`)
  );
  if (!snapshot.exists()) return null;
  return snapshot.val() as Record<string, any>;
}

export async function getOrdersByPhone(
  branchId: string,
  phone: string
) {
  const snapshot = await get(child(ref(db), `branches/${branchId}/orders`));
  if (!snapshot.exists()) return [];

  const orders = snapshot.val() as Record<string, any>;
  return Object.entries(orders)
    .filter(([, o]) => o.phone === phone)
    .map(([id, o]) => ({ id, ...o }));
}
