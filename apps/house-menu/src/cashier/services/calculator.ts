import type { Order } from '../types';

export interface KPIs {
  totalEfectivo: number;
  totalYapePlin: number;
  totalPos: number;
  totalPendiente: number;
  totalPorVerificar: number;
  totalIngresos: number;
  expectedCash: number;
  porVerificar: Order[];
  pendingOrders: Order[];
  paidCount: number;
  cancelledCount: number;
  averageTicket: number;
}

export function calculateKPIs(orders: Order[], openingBalance: number): KPIs {
  const active = orders.filter(o => o.status !== 'cancelado');

  const totalEfectivo = active
    .filter(o => o.payment_method === 'Efectivo' && o.payment_status === 'pagado')
    .reduce((s, o) => s + (o.financials?.total || 0), 0);

  const totalYapePlin = active
    .filter(o => o.payment_method === 'Yape/Plin' && o.payment_status === 'pagado')
    .reduce((s, o) => s + (o.financials?.total || 0), 0);

  const totalPos = active
    .filter(o => o.payment_method === 'Tarjeta (POS)' && o.payment_status === 'pagado')
    .reduce((s, o) => s + (o.financials?.total || 0), 0);

  const totalPendiente = active
    .filter(o =>
      o.payment_status !== 'pagado' &&
      o.payment_status !== 'reembolsado' &&
      o.payment_status !== 'por_verificar'
    )
    .reduce((s, o) => s + (o.financials?.total || 0), 0);

  const porVerificar = orders.filter(o => o.payment_status === 'por_verificar');
  const totalPorVerificar = porVerificar.reduce((s, o) => s + (o.financials?.total || 0), 0);

  const paid = active.filter(o => o.payment_status === 'pagado');
  const totalIngresos = totalEfectivo + totalYapePlin + totalPos;

  const pendingOrders = orders.filter(o =>
    o.status !== 'cancelado' &&
    o.payment_status !== 'pagado' &&
    o.payment_status !== 'reembolsado' &&
    o.payment_status !== 'por_verificar'
  );

  return {
    totalEfectivo,
    totalYapePlin,
    totalPos,
    totalPendiente,
    totalPorVerificar,
    totalIngresos,
    expectedCash: openingBalance + totalEfectivo,
    porVerificar,
    pendingOrders,
    paidCount: paid.length,
    cancelledCount: orders.filter(o => o.status === 'cancelado').length,
    averageTicket: paid.length > 0 ? totalIngresos / paid.length : 0,
  };
}

export function applyDiscount(
  base: number,
  type: 'none' | 'percentage' | 'fixed',
  value: number
): number {
  if (type === 'none' || !value || value <= 0) return base;
  if (type === 'percentage') return Math.max(0, base * (1 - Math.min(value, 100) / 100));
  return Math.max(0, base - value);
}

export function calculateSplitTotal(
  items: { price: number; quantity: number }[],
  indices: number[]
): number {
  return indices.reduce((sum, i) => {
    const item = items[i];
    return sum + (item?.price || 0) * (item?.quantity || 1);
  }, 0);
}

export function calculateChange(paid: number, total: number): number {
  return paid - total;
}

export interface DinerSplit {
  name: string;
  items: number[];
  total: number;
}

export function calculateSplitDistribution(
  items: { price: number; quantity: number }[],
  diners: { name: string; items: number[] }[]
): DinerSplit[] {
  const assigned = new Set<number>();
  return diners.map(diner => {
    const valid = diner.items.filter(i => i >= 0 && i < items.length);
    valid.forEach(i => assigned.add(i));
    return {
      name: diner.name,
      items: valid,
      total: calculateSplitTotal(items, valid),
    };
  });
}

export function getUnassignedItems(
  totalItems: number,
  diners: { items: number[] }[]
): number[] {
  const assigned = new Set<number>();
  for (const d of diners) d.items.forEach(i => assigned.add(i));
  const all = Array.from({ length: totalItems }, (_, i) => i);
  return all.filter(i => !assigned.has(i));
}

export function validateSplitBalance(
  items: { price: number; quantity: number }[],
  diners: { items: number[] }[]
): { balanced: boolean; totalAssigned: number; totalOrder: number; unassigned: number[] } {
  const totalOrder = items.reduce((s, item) => s + (item.price || 0) * (item.quantity || 1), 0);
  const unassigned = getUnassignedItems(items.length, diners);
  const allIndices = items.map((_, idx) => idx);
  const assignedTotal = calculateSplitTotal(items, allIndices.filter(idx => !unassigned.includes(idx)));
  return {
    balanced: unassigned.length === 0,
    totalAssigned: assignedTotal,
    totalOrder,
    unassigned,
  };
}

export function calculateDiscountedPrice(
  item: { price: number; quantity: number },
  discount?: { type: 'percentage' | 'fixed'; value: number } | null
): number {
  if (!discount) return (item.price || 0) * (item.quantity || 1);
  const base = (item.price || 0) * (item.quantity || 1);
  return applyDiscount(base, discount.type, discount.value);
}
