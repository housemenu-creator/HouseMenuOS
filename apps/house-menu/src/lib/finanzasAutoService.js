import { ref, push, set } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { nowISO } from './format';
import { pub } from '@house/event-bus';

const FIN = (branchId) => `branches/${branchId}/finanzas`;

export async function recordCOGSExpense(branchId, { orderId, totalCost, items, date }) {
  const gasto = {
    description: `COGS - Pedido #${orderId?.slice(-6) || '?'}`,
    amount: totalCost,
    category: 'Insumos',
    date: date || nowISO().split('T')[0],
    type: 'automático',
    source: {
      type: 'cogs',
      refId: orderId,
      refDescription: `Consumo de ${items?.length || 0} insumos en pedido`,
    },
    createdAt: nowISO(),
  };
  const ref_ = ref(db, `${FIN(branchId)}/gastos`);
  const newRef = push(ref_);
  await set(newRef, gasto);
  return { success: true, id: newRef.key };
}

export async function recordPOExpense(branchId, { poId, supplierName, totalAmount, date }) {
  const gasto = {
    description: `Compra - ${supplierName} (OC #${poId?.slice(-6) || '?'})`,
    amount: totalAmount,
    category: 'Insumos',
    date: date || nowISO().split('T')[0],
    type: 'automático',
    source: {
      type: 'purchase',
      refId: poId,
      refDescription: `OC a ${supplierName}`,
    },
    createdAt: nowISO(),
  };
  const ref_ = ref(db, `${FIN(branchId)}/gastos`);
  const newRef = push(ref_);
  await set(newRef, gasto);
  return { success: true, id: newRef.key };
}

export async function recordWasteExpense(branchId, { wasteId, ingredientName, quantity, unitCost, totalCost, reason, date }) {
  const gasto = {
    description: `Merma: ${ingredientName} (${quantity}) - ${reason}`,
    amount: totalCost,
    category: 'Otros',
    date: date || nowISO().split('T')[0],
    type: 'automático',
    source: {
      type: 'waste',
      refId: wasteId,
      refDescription: `Merma de ${ingredientName} por ${reason}`,
    },
    createdAt: nowISO(),
  };
  const ref_ = ref(db, `${FIN(branchId)}/gastos`);
  const newRef = push(ref_);
  await set(newRef, gasto);
  return { success: true, id: newRef.key };
}
