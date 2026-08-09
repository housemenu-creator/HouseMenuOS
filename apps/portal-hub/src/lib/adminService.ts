import { ref, get, set, update, push, child, remove } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import type { Supplier, AdminProduct, PurchaseOrder, AutomationRule } from '../types';

// ══════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════

function todayStr() { return new Date().toISOString().slice(0, 10); }
function nowISO() { return new Date().toISOString(); }

async function writeAudit(action: string, details: Record<string, unknown>, by: string) {
  // ponytail: one audit log per action, under date-partitioned path
  const date = todayStr();
  const logRef = push(child(ref(db), `admin_audit/logs/${date}`));
  await set(logRef, { action, details, by, timestamp: nowISO() });
}

// ══════════════════════════════════════════════
//  Suppliers
// ══════════════════════════════════════════════

export async function listSuppliers(): Promise<Supplier[]> {
  const snap = await get(ref(db, 'suppliers'));
  if (!snap.exists()) return [];
  const data = snap.val() as Record<string, Supplier>;
  return Object.entries(data).map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => a.name?.localeCompare(b.name || '') || 0);
}

export async function createSupplier(data: Omit<Supplier, 'id' | 'createdAt'>, by: string): Promise<string> {
  const newRef = push(ref(db, 'suppliers'));
  const supplier = { ...data, active: true, createdAt: nowISO(), updatedAt: nowISO() };
  await set(newRef, supplier);
  await writeAudit('supplier.create', { supplierId: newRef.key, name: data.name }, by);
  return newRef.key!;
}

export async function updateSupplier(id: string, data: Partial<Supplier>, by: string): Promise<void> {
  await update(child(ref(db), `suppliers/${id}`), { ...data, updatedAt: nowISO() });
  await writeAudit('supplier.update', { supplierId: id, changes: Object.keys(data) }, by);
}

export async function deactivateSupplier(id: string, by: string): Promise<void> {
  await update(child(ref(db), `suppliers/${id}`), { active: false, updatedAt: nowISO() });
  await writeAudit('supplier.deactivate', { supplierId: id }, by);
}

// ══════════════════════════════════════════════
//  Products
// ══════════════════════════════════════════════

export async function listProducts(branchId: string): Promise<AdminProduct[]> {
  const snap = await get(child(ref(db), `branches/${branchId}/catalog/products`));
  if (!snap.exists()) return [];
  const data = snap.val() as Record<string, Record<string, unknown>>;
  return Object.entries(data).map(([id, p]) => ({
    id,
    name: String(p.name || ''),
    category: String(p.category || ''),
    base_price: Number(p.base_price) || 0,
    stock: p.stock !== undefined ? Number(p.stock) : undefined,
    minStock: p.minStock !== undefined ? Number(p.minStock) : undefined,
    supplierId: p.supplierId ? String(p.supplierId) : undefined,
    trackStock: p.trackStock === true,
    available: p.available !== false,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateProduct(branchId: string, productId: string, data: Partial<AdminProduct>, by: string): Promise<void> {
  const allowed = ['minStock', 'supplierId', 'trackStock', 'available'] as const;
  const payload: Record<string, unknown> = {};
  for (const key of allowed) {
    if (data[key] !== undefined) payload[key] = data[key];
  }
  await update(child(ref(db), `branches/${branchId}/catalog/products/${productId}`), payload);
  await writeAudit('product.update', { branchId, productId, changes: Object.keys(payload) }, by);
}

// ══════════════════════════════════════════════
//  Purchase Orders
// ══════════════════════════════════════════════

export async function listPurchaseOrders(branchId: string): Promise<PurchaseOrder[]> {
  const snap = await get(child(ref(db), `purchaseOrders/${branchId}`));
  if (!snap.exists()) return [];
  const data = snap.val() as Record<string, Record<string, unknown>>;
  return Object.entries(data).map(([id, po]) => ({
    id,
    branchId: String(po.branchId || branchId),
    supplierId: String(po.supplierId || ''),
    status: String(po.status || 'pending'),
    items: Array.isArray(po.items) ? po.items : [],
    total: Number(po.total) || 0,
    createdBy: String(po.createdBy || 'system'),
    createdAt: String(po.createdAt || ''),
    correlationId: String(po.correlationId || ''),
    statusHistory: Array.isArray(po.statusHistory) ? po.statusHistory : [],
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updatePurchaseOrderStatus(branchId: string, poId: string, status: string, by: string): Promise<void> {
  const entry = { status, timestamp: nowISO(), by };
  const historyRef = child(ref(db), `purchaseOrders/${branchId}/${poId}/statusHistory`);
  const currentSnap = await get(historyRef);
  const history = currentSnap.exists() ? Object.values(currentSnap.val()) : [];
  history.push(entry);
  await update(child(ref(db), `purchaseOrders/${branchId}/${poId}`), { status, statusHistory: history });
  await writeAudit('purchase_order.status', { branchId, poId, status }, by);
}

// ══════════════════════════════════════════════
//  Automation Rules
// ══════════════════════════════════════════════

const DEFAULT_RULES: Omit<AutomationRule, 'id'>[] = [
  { name: 'Auto PO cuando stock bajo', eventType: 'inventory.stock.low', enabled: true, config: { quantityFormula: 'minStock * 1.5' } },
  { name: 'Notificar en PO creada', eventType: 'purchase_order.created', enabled: true, config: {} },
  { name: 'Actualizar inventario al confirmar', eventType: 'purchase_order.confirmed', enabled: false, config: {} },
  { name: 'Marcar como listo', eventType: 'purchase_order.ready', enabled: false, config: {} },
  { name: 'Cerrar OC al recibir', eventType: 'purchase_order.delivered', enabled: false, config: {} },
];

export async function listAutomationRules(): Promise<AutomationRule[]> {
  const snap = await get(ref(db, 'automation/rules'));
  if (!snap.exists()) return [];
  const data = snap.val() as Record<string, AutomationRule>;
  return Object.entries(data).map(([id, r]) => ({ id, ...r }));
}

export async function seedDefaultRules(by: string): Promise<void> {
  const existing = await listAutomationRules();
  if (existing.length > 0) return; // already seeded
  for (const rule of DEFAULT_RULES) {
    const newRef = push(ref(db, 'automation/rules'));
    await set(newRef, { ...rule, createdAt: nowISO(), updatedAt: nowISO() });
  }
  await writeAudit('automation.seed', { count: DEFAULT_RULES.length }, by);
}

export async function toggleRule(ruleId: string, enabled: boolean, by: string): Promise<void> {
  await update(child(ref(db), `automation/rules/${ruleId}`), { enabled, updatedAt: nowISO() });
  await writeAudit('automation.toggle', { ruleId, enabled }, by);
}

export async function deleteRule(ruleId: string, by: string): Promise<void> {
  await remove(child(ref(db), `automation/rules/${ruleId}`));
  await writeAudit('automation.delete', { ruleId }, by);
}

// ══════════════════════════════════════════════
//  Pipeline Config
// ══════════════════════════════════════════════

export async function getPipelineConfig(branchId: string): Promise<Record<string, any>> {
  const snap = await get(child(ref(db), `tenants/${branchId}/config`));
  if (!snap.exists()) return { pipeline: { status: 'no config' } };
  return snap.val() as Record<string, any>;
}

// ══════════════════════════════════════════════
//  Events / Pipeline
// ══════════════════════════════════════════════

export async function listRecentEvents(limit = 30): Promise<Record<string, unknown>[]> {
  // ponytail: flat scan across all tenants — fine for <1000 events
  const snap = await get(ref(db, 'events'));
  if (!snap.exists()) return [];
  const tenants = snap.val() as Record<string, unknown>;
  const all: Record<string, unknown>[] = [];
  for (const [tenantId, statuses] of Object.entries(tenants)) {
    if (!statuses || typeof statuses !== 'object') continue;
    for (const [status, events] of Object.entries(statuses as Record<string, unknown>)) {
      if (!events || typeof events !== 'object') continue;
      for (const [eventId, ev] of Object.entries(events as Record<string, unknown>)) {
        if (ev && typeof ev === 'object') {
          all.push({ tenantId, status, eventId, ...(ev as Record<string, unknown>) });
        }
      }
    }
  }
  return all.sort((a, b) => String(b.occurredAt || b.timestamp || '').localeCompare(String(a.occurredAt || a.timestamp || ''))).slice(0, limit);
}

// ══════════════════════════════════════════════
//  Audit Log
// ══════════════════════════════════════════════

export async function listAuditLogs(days = 7): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const snap = await get(child(ref(db), `admin_audit/logs/${dateStr}`));
    if (snap.exists()) {
      for (const [id, entry] of Object.entries(snap.val() as Record<string, unknown>)) {
        all.push({ id, date: dateStr, ...(entry as Record<string, unknown>) });
      }
    }
  }
  return all.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
}
