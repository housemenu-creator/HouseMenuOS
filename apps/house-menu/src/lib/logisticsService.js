import { ref, get, set, push, update, remove, runTransaction, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { pub } from '@house/event-bus';
import { nowISO } from './format';

/* ─── PATHS ─── */
const LOG = (branchId) => `branches/${branchId}/logistics`;

/* ─── INGREDIENTES ─── */

export async function createIngredient(branchId, data) {
  const ref_ = ref(db, `${LOG(branchId)}/ingredients`);
  const newRef = push(ref_);
  const ingredient = {
    name: data.name,
    unit: data.unit || 'unidad',
    stock: Number(data.stock) || 0,
    minStock: Number(data.minStock) || 0,
    cost: Number(data.cost) || 0,
    supplierId: data.supplierId || null,
    category: data.category || null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await set(newRef, ingredient);
  return { success: true, id: newRef.key };
}

export async function updateIngredient(branchId, ingredientId, data) {
  const { id, createdAt, ...safe } = data;
  await update(ref(db, `${LOG(branchId)}/ingredients/${ingredientId}`), { ...safe, updatedAt: nowISO() });
  return { success: true };
}

export async function deleteIngredient(branchId, ingredientId) {
  // Check if ingredient is used in any recipe
  const recipesSnap = await get(ref(db, `${LOG(branchId)}/recipes`));
  const recipes = recipesSnap.val();
  if (recipes) {
    for (const [recipeId, recipe] of Object.entries(recipes)) {
      const r = recipe;
      if (r.ingredients && r.ingredients[ingredientId]) {
        return { success: false, error: `No se puede eliminar: está en uso en la receta "${r.productName || recipeId}"` };
      }
    }
  }
  await remove(ref(db, `${LOG(branchId)}/ingredients/${ingredientId}`));
  return { success: true };
}

export function subscribeIngredients(branchId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/ingredients`), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, i]) => ({ id, ...i })));
  });
}

/* ─── RECETAS ─── */

export async function createRecipe(branchId, data) {
  const ref_ = ref(db, `${LOG(branchId)}/recipes`);
  const newRef = push(ref_);

  // Calcular costo por porción
  let totalCost = 0;
  const ingredients = {};
  if (data.ingredients) {
    for (const ing of data.ingredients) {
      const cost = ing.unitCost ? ing.quantity * ing.unitCost : 0;
      totalCost += cost;
      ingredients[ing.ingredientId] = {
        ingredientId: ing.ingredientId,
        name: ing.name,
        quantity: Number(ing.quantity),
        unit: ing.unit,
        unitCost: Number(ing.unitCost) || 0,
      };
    }
  }

  const recipe = {
    productId: data.productId || null,
    productName: data.productName || '',
    yield: Number(data.yield) || 1,
    ingredients,
    costPerPortion: totalCost / (Number(data.yield) || 1),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await set(newRef, recipe);
  return { success: true, id: newRef.key };
}

export async function updateRecipe(branchId, recipeId, data) {
  const existingSnap = await get(ref(db, `${LOG(branchId)}/recipes/${recipeId}`));
  const existing = existingSnap.val();
  if (!existing) return { success: false, error: 'Receta no encontrada' };

  let ingredients = existing.ingredients || {};
  let yieldVal = data.yield !== undefined ? Number(data.yield) : existing.yield;

  if (data.ingredients) {
    let totalCost = 0;
    const newIngredients = {};
    for (const ing of data.ingredients) {
      const cost = ing.unitCost ? ing.quantity * ing.unitCost : 0;
      totalCost += cost;
      newIngredients[ing.ingredientId] = {
        ingredientId: ing.ingredientId,
        name: ing.name,
        quantity: Number(ing.quantity),
        unit: ing.unit,
        unitCost: Number(ing.unitCost) || 0,
      };
    }
    ingredients = newIngredients;
  }

  const { id, createdAt, ...safeData } = data;
  const updates = {
    ...safeData,
    ingredients,
    costPerPortion: Object.values(ingredients).reduce((s, i) => s + (i.unitCost * i.quantity || 0), 0) / yieldVal,
    updatedAt: nowISO(),
  };
  delete updates.ingredients;
  await set(ref(db, `${LOG(branchId)}/recipes/${recipeId}`), { ...existing, ...updates, ingredients });
  return { success: true };
}

export async function deleteRecipe(branchId, recipeId) {
  await remove(ref(db, `${LOG(branchId)}/recipes/${recipeId}`));
  return { success: true };
}

export function subscribeRecipes(branchId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/recipes`), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, r]) => ({ id, ...r })));
  });
}

/* ─── MOVIMIENTOS DE INVENTARIO (KARDEX) ─── */

export async function registerMovement(branchId, data) {
  const ref_ = ref(db, `${LOG(branchId)}/movements`);
  const newRef = push(ref_);
  const movement = {
    ingredientId: data.ingredientId,
    type: data.type, // 'entrada' | 'salida' | 'ajuste'
    quantity: Number(data.quantity),
    unit: data.unit,
    reason: data.reason || '',
    reference: data.reference || '',
    cost: Number(data.cost) || 0,
    stockAfter: 0, // se llena abajo
    createdAt: nowISO(),
    createdBy: data.createdBy || '',
  };

  // Actualizar stock del ingrediente
  const ingredientRef = ref(db, `${LOG(branchId)}/ingredients/${data.ingredientId}`);
  let newStock = 0;
  let minStock = 0;
  let ingredientName = '';
  let supplierId = null;
  await runTransaction(ingredientRef, (ing) => {
    if (!ing) return;
    const current = Number(ing.stock) || 0;
    minStock = Number(ing.minStock) || 0;
    ingredientName = ing.name || '';
    supplierId = ing.supplierId || null;
    if (data.type === 'entrada') newStock = current + Number(data.quantity);
    else if (data.type === 'salida') newStock = Math.max(0, current - Number(data.quantity));
    else newStock = Number(data.quantity); // ajuste = seteo directo
    ing.stock = newStock;
    ing.updatedAt = nowISO();
    return ing;
  });

  movement.stockAfter = newStock;
  await set(newRef, movement);

  // ── Evento: stock bajo ──────────────────────────────────
  // Dispara automáticamente si el stock queda debajo del mínimo
  if (newStock < minStock && minStock > 0) {
    try {
      await pub('inventory.stock.low', {
        productId: data.ingredientId,
        productName: ingredientName,
        currentStock: newStock,
        minStock,
        supplierId: supplierId || data.supplierId || null,
      }, {
        branchId,
        userEmail: data.createdBy || 'system',
        userRole: 'admin',
      });
    } catch (err) {
      // El event-bus nunca debe romper una operación de inventario
      console.warn('[logistics] No se pudo publicar evento stock.low:', err.message);
    }
  }

  return { success: true, id: newRef.key };
}

export function subscribeMovements(branchId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/movements`), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  });
}

/* ─── PROVEEDORES ─── */

export async function createSupplier(branchId, data) {
  const ref_ = ref(db, `${LOG(branchId)}/suppliers`);
  const newRef = push(ref_);
  const supplier = {
    name: data.name,
    contacto: data.contacto || '',
    telefono: data.telefono || '',
    email: data.email || '',
    direccion: data.direccion || '',
    tipoDocumento: data.tipoDocumento || 'informal',
    numDocumento: data.numDocumento || '',
    plazoPago: data.plazoPago || 'contado',
    categorias: data.categorias || [],
    activo: data.activo !== false,
    notes: data.notes || '',
    createdAt: nowISO(),
  };
  await set(newRef, supplier);
  return { success: true, id: newRef.key };
}

export async function updateSupplier(branchId, supplierId, data) {
  const { id, createdAt, ...safe } = data;
  await update(ref(db, `${LOG(branchId)}/suppliers/${supplierId}`), safe);
  return { success: true };
}

export async function deleteSupplier(branchId, supplierId) {
  await remove(ref(db, `${LOG(branchId)}/suppliers/${supplierId}`));
  return { success: true };
}

export function subscribeSuppliers(branchId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/suppliers`), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, s]) => ({ id, ...s })));
  });
}

/* ─── ÓRDENES DE COMPRA ─── */

export async function createPurchaseOrder(branchId, data) {
  const ref_ = ref(db, `${LOG(branchId)}/purchase_orders`);
  const newRef = push(ref_);
  let total = 0;
  const items = {};
  if (data.items) {
    for (const item of data.items) {
      const lineTotal = item.quantity * item.unitCost;
      total += lineTotal;
      items[item.ingredientId] = {
        ingredientId: item.ingredientId,
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitCost: Number(item.unitCost),
        total: lineTotal,
      };
    }
  }
  const order = {
    supplierId: data.supplierId || null,
    supplierName: data.supplierName || '',
    items,
    total,
    status: 'pendiente',
    notes: data.notes || '',
    orderedAt: nowISO(),
    receivedAt: null,
  };
  await set(newRef, order);
  return { success: true, id: newRef.key };
}

export async function receivePurchaseOrder(branchId, orderId) {
  const snap = await get(ref(db, `${LOG(branchId)}/purchase_orders/${orderId}`));
  const order = snap.val();
  if (!order || order.status !== 'pendiente') return { success: false, error: 'Orden no encontrada o ya recibida' };

  // Registrar entrada de cada item
  for (const item of Object.values(order.items)) {
    await registerMovement(branchId, {
      ingredientId: item.ingredientId,
      type: 'entrada',
      quantity: item.quantity,
      unit: item.unit,
      reason: 'Compra',
      reference: `PO-${orderId.slice(-6)}`,
      cost: item.total,
      createdBy: 'system',
    });
  }

  await update(ref(db, `${LOG(branchId)}/purchase_orders/${orderId}`), {
    status: 'recibido',
    receivedAt: nowISO(),
  });
  return { success: true };
}

export async function cancelPurchaseOrder(branchId, orderId) {
  await update(ref(db, `${LOG(branchId)}/purchase_orders/${orderId}`), { status: 'cancelado' });
  return { success: true };
}

export function subscribePurchaseOrders(branchId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/purchase_orders`), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, o]) => ({ id, ...o }))
      .sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt)));
  });
}

/* ─── COGS (Costo de productos vendidos) ─── */

export async function getProductCost(branchId, productId) {
  const snap = await get(ref(db, `${LOG(branchId)}/recipes`));
  const data = snap.val();
  if (!data) return 0;
  for (const [id, r] of Object.entries(data)) {
    if (r.productId === productId) return r.costPerPortion || 0;
  }
  return 0;
}

export function subscribeCOGS(branchId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/recipes`), (snap) => {
    const data = snap.val();
    if (!data) { callback({}); return; }
    const cogs = {};
    for (const [id, r] of Object.entries(data)) {
      if (r.productId) {
        cogs[r.productId] = { recipeId: id, productName: r.productName, costPerPortion: r.costPerPortion || 0 };
      }
    }
    callback(cogs);
  });
}
