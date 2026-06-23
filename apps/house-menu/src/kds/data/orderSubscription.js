import { ref, onChildAdded, onChildChanged, onChildRemoved, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

const getOrdersPath = (branchId) => `branches/${branchId || 'monteverde'}/orders`;

export function subscribeOrdersDelta(branchId, { onAdd, onChange, onRemove }) {
  const ordersRef = ref(db, getOrdersPath(branchId));
  const handlers = [];

  if (onAdd) {
    const unsub = onChildAdded(ordersRef, (snap) => {
      onAdd({ id: snap.key, ...snap.val() });
    });
    handlers.push(unsub);
  }

  if (onChange) {
    const unsub = onChildChanged(ordersRef, (snap) => {
      onChange({ id: snap.key, ...snap.val() });
    });
    handlers.push(unsub);
  }

  if (onRemove) {
    const unsub = onChildRemoved(ordersRef, (snap) => {
      onRemove(snap.key);
    });
    handlers.push(unsub);
  }

  return () => {
    handlers.forEach((unsub) => unsub());
  };
}

export function subscribeOrderSingle(branchId, orderId, callback) {
  const orderRef = ref(db, `${getOrdersPath(branchId)}/${orderId}`);
  return onValue(orderRef, (snap) => {
    const data = snap.val();
    callback(data ? { id: snap.key, ...data } : null);
  });
}
