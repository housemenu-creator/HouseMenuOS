import { ref, get, set, push, update, remove, runTransaction, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { pub } from '@house/event-bus';
import { nowISO } from './format';
import { auditLog } from './auditService';

/* ─── PATHS ─── */
const LOG = (branchId) => `branches/${branchId}/logistics`;

/* Normalize single-or-array fields to arrays (backward compat with old data) */
const normList = (v, legacy) => {
  if (Array.isArray(v)) return v;
  if (v) return [v];
  if (legacy) return [legacy];
  return [];
};

/* ─── INGREDIENTES ─── */

export async function createIngredient(branchId, data, actor) {
  const ref_ = ref(db, `${LOG(branchId)}/ingredients`);
  const newRef = push(ref_);
  const ingredient = {
    name: data.name,
    unit: data.unit || 'unidad',
    stock: 0, // el stock inicial entra vía movimiento de Kardex
    minStock: Number(data.minStock) || 0,
    cost: Number(data.cost) || 0,
    supplierIds: normList(data.supplierIds, data.supplierId),
    categories: normList(data.categories, data.category),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await set(newRef, ingredient);
  // Stock inicial registrado en el Kardex (registerMovement suma al stock actual)
  if (Number(data.stock) > 0) {
    await registerMovement(branchId, {
      ingredientId: newRef.key,
      type: 'entrada',
      quantity: Number(data.stock),
      unit: ingredient.unit,
      reason: 'Stock inicial',
      createdBy: actor,
    });
  }
  auditLog('logistics.ingredient.created', { branchId, ingredientId: newRef.key, name: ingredient.name, categories: ingredient.categories, supplierIds: ingredient.supplierIds, initialStock: Number(data.stock) || 0 }, actor);
  return { success: true, id: newRef.key };
}

export async function updateIngredient(branchId, ingredientId, data, actor) {
  const { id, createdAt, ...safe } = data;
  await update(ref(db, `${LOG(branchId)}/ingredients/${ingredientId}`), { ...safe, updatedAt: nowISO() });
  auditLog('logistics.ingredient.updated', { branchId, ingredientId, name: data.name, changes: Object.keys(safe) }, actor);
  return { success: true };
}

export async function deleteIngredient(branchId, ingredientId, actor) {
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
  const ingSnap = await get(ref(db, `${LOG(branchId)}/ingredients/${ingredientId}`));
  const ing = ingSnap.val();
  await remove(ref(db, `${LOG(branchId)}/ingredients/${ingredientId}`));
  auditLog('logistics.ingredient.deleted', { branchId, ingredientId, name: ing?.name }, actor);
  return { success: true };
}

export function subscribeIngredients(branchId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/ingredients`), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, i]) => ({
      id,
      ...i,
      supplierIds: normList(i.supplierIds, i.supplierId),
      categories: normList(i.categories, i.category),
    })));
  });
}

/* ─── RECETAS ─── */

export async function createRecipe(branchId, data, actor) {
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
  auditLog('logistics.recipe.created', { branchId, recipeId: newRef.key, productName: recipe.productName, ingredientCount: Object.keys(ingredients).length }, actor);
  return { success: true, id: newRef.key };
}

export async function updateRecipe(branchId, recipeId, data, actor) {
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
  auditLog('logistics.recipe.updated', { branchId, recipeId, productName: data.productName || existing.productName }, actor);
  return { success: true };
}

export async function deleteRecipe(branchId, recipeId, actor) {
  const snap = await get(ref(db, `${LOG(branchId)}/recipes/${recipeId}`));
  const r = snap.val();
  await remove(ref(db, `${LOG(branchId)}/recipes/${recipeId}`));
  auditLog('logistics.recipe.deleted', { branchId, recipeId, productName: r?.productName }, actor);
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
  let supplierIds = [];
  await runTransaction(ingredientRef, (ing) => {
    if (!ing) return;
    const current = Number(ing.stock) || 0;
    minStock = Number(ing.minStock) || 0;
    ingredientName = ing.name || '';
    supplierIds = normList(ing.supplierIds, ing.supplierId);
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
        supplierId: supplierIds[0] || data.supplierId || null,
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

export async function createSupplier(branchId, data, actor) {
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
  auditLog('logistics.supplier.created', { branchId, supplierId: newRef.key, name: supplier.name, tipoDocumento: supplier.tipoDocumento }, actor);
  return { success: true, id: newRef.key };
}

export async function updateSupplier(branchId, supplierId, data, actor) {
  const { id, createdAt, ...safe } = data;
  await update(ref(db, `${LOG(branchId)}/suppliers/${supplierId}`), safe);
  auditLog('logistics.supplier.updated', { branchId, supplierId, name: data.name, changes: Object.keys(safe) }, actor);
  return { success: true };
}

export async function deleteSupplier(branchId, supplierId, actor) {
  const snap = await get(ref(db, `${LOG(branchId)}/suppliers/${supplierId}`));
  const s = snap.val();
  await remove(ref(db, `${LOG(branchId)}/suppliers/${supplierId}`));
  auditLog('logistics.supplier.deleted', { branchId, supplierId, name: s?.name }, actor);
  return { success: true };
}

export function subscribeSuppliers(branchId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/suppliers`), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, s]) => ({ id, ...s })));
  });
}

/* ─── CATEGORÍAS DE INSUMOS ─── */

export function subscribeCategories(branchId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/categories`), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, c]) => ({ id, ...c })).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
  });
}

export async function createCategory(branchId, name, actor) {
  const clean = String(name || '').trim();
  if (!clean) return { success: false, error: 'Nombre requerido' };
  const ref_ = ref(db, `${LOG(branchId)}/categories`);
  const newRef = push(ref_);
  await set(newRef, { name: clean, createdAt: nowISO() });
  auditLog('logistics.category.created', { branchId, categoryId: newRef.key, name: clean }, actor);
  return { success: true, id: newRef.key };
}

/**
 * Rename a category in the catalog AND update every ingredient that uses it.
 * Ingredients store the category NAME (not id), so the rename must propagate.
 */
export async function renameCategory(branchId, categoryId, oldName, newName, actor) {
  const clean = String(newName || '').trim();
  if (!clean) return { success: false, error: 'Nombre requerido' };
  const updates = {};
  updates[`${LOG(branchId)}/categories/${categoryId}/name`] = clean;

  const ingsSnap = await get(ref(db, `${LOG(branchId)}/ingredients`));
  const ings = ingsSnap.val();
  let affected = 0;
  if (ings) {
    for (const [id, ing] of Object.entries(ings)) {
      const cats = normList(ing.categories, ing.category);
      if (cats.includes(String(oldName))) {
        updates[`${LOG(branchId)}/ingredients/${id}/categories`] = cats.map(c => (String(c) === String(oldName) ? clean : c));
        affected++;
      }
    }
  }
  await update(ref(db), updates);
  auditLog('logistics.category.renamed', { branchId, categoryId, oldName, newName: clean, ingredientsAffected: affected }, actor);
  return { success: true };
}

export async function deleteCategory(branchId, categoryId, name, actor) {
  // Remove category from catalog; ingredients using it keep the name as a free tag
  const updates = {};
  updates[`${LOG(branchId)}/categories/${categoryId}`] = null;
  await update(ref(db), updates);
  auditLog('logistics.category.deleted', { branchId, categoryId, name }, actor);
  return { success: true };
}

/* ─── ÓRDENES DE COMPRA ─── */

/** Normaliza items de orden → mapa por ingredientId + total. */
function buildOrderItems(items) {
  const itemMap = {};
  let total = 0;
  if (items) {
    for (const item of items) {
      const lineTotal = item.quantity * item.unitCost;
      total += lineTotal;
      itemMap[item.ingredientId] = {
        ingredientId: item.ingredientId,
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitCost: Number(item.unitCost),
        total: lineTotal,
      };
    }
  }
  return { items: itemMap, total };
}

export async function createPurchaseOrder(branchId, data, actor) {
  const { items, total } = buildOrderItems(data.items);
  const newRef = push(ref(db, `${LOG(branchId)}/purchase_orders`));
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
  auditLog('logistics.purchase_order.created', { branchId, orderId: newRef.key, supplierName: order.supplierName, total: order.total, itemCount: Object.keys(items).length }, actor);
  return { success: true, id: newRef.key };
}

/** Pre-pedido del equipo de staff: sin proveedor, lo confirma el admin. */
export async function createPreOrder(branchId, items, notes, actor) {
  const { items: itemMap, total } = buildOrderItems(items);
  const newRef = push(ref(db, `${LOG(branchId)}/purchase_orders`));
  await set(newRef, {
    supplierId: null,
    supplierName: null,
    items: itemMap,
    total,
    status: 'pre_pedido',
    notes: notes || '',
    requestedBy: actor || 'staff',
    orderedAt: nowISO(),
    receivedAt: null,
  });
  auditLog('logistics.purchase_order.pre_created', { branchId, orderId: newRef.key, total, itemCount: Object.keys(itemMap).length }, actor);
  return { success: true, id: newRef.key };
}

/** Admin asigna proveedor a un pre-pedido y lo convierte en OC pendiente. */
export async function confirmPreOrder(branchId, orderId, { supplierId, supplierName }, actor) {
  const snap = await get(ref(db, `${LOG(branchId)}/purchase_orders/${orderId}`));
  const order = snap.val();
  if (!order || order.status !== 'pre_pedido') {
    return { success: false, error: 'El pre-pedido no existe o ya fue procesado' };
  }
  await update(ref(db, `${LOG(branchId)}/purchase_orders/${orderId}`), {
    supplierId,
    supplierName: supplierName || '',
    status: 'pendiente',
    confirmedAt: nowISO(),
  });
  auditLog('logistics.purchase_order.confirmed', { branchId, orderId, supplierName }, actor);
  return { success: true };
}

export async function updatePurchaseOrder(branchId, orderId, data, actor) {
  const snap = await get(ref(db, `${LOG(branchId)}/purchase_orders/${orderId}`));
  const existing = snap.val();
  if (!existing || existing.status !== 'pendiente') {
    return { success: false, error: 'Solo se pueden editar órdenes pendientes' };
  }
  const { items, total } = buildOrderItems(data.items);
  await update(ref(db, `${LOG(branchId)}/purchase_orders/${orderId}`), {
    supplierId: data.supplierId || existing.supplierId,
    supplierName: data.supplierName || existing.supplierName,
    items,
    total,
    notes: data.notes ?? existing.notes,
    updatedAt: nowISO(),
  });
  auditLog('logistics.purchase_order.updated', { branchId, orderId, supplierName: data.supplierName || existing.supplierName, total }, actor);
  return { success: true };
}

export async function receivePurchaseOrder(branchId, orderId, actor, quantities) {
  const orderRef = ref(db, `${LOG(branchId)}/purchase_orders/${orderId}`);

  // Lock atómico: marca recibida SOLO si sigue pendiente. Si otro recibo
  // (doble click, otra pestaña) ya corrió, la transacción aborta y no se
  // duplican los movimientos de stock.
  let order = null;
  const txn = await runTransaction(orderRef, (current) => {
    if (!current || current.status !== 'pendiente') return undefined; // abort
    order = current;
    return { ...current, status: 'recibido', receivedAt: nowISO() };
  });
  if (!txn.committed || !order) {
    return { success: false, error: 'Orden no encontrada o ya recibida' };
  }

  const priceChanges = [];

  for (const item of Object.values(order.items || {})) {
    // Cantidad real recibida: la confirmada en la recepción, o la pedida por defecto
    const qty = quantities && quantities[item.ingredientId] !== undefined
      ? Number(quantities[item.ingredientId])
      : Number(item.quantity);
    if (qty <= 0) continue;

    await registerMovement(branchId, {
      ingredientId: item.ingredientId,
      type: 'entrada',
      quantity: qty,
      unit: item.unit,
      reason: 'Compra',
      reference: `PO-${orderId.slice(-6)}`,
      cost: qty * Number(item.unitCost || 0),
      createdBy: 'system',
    });

    // Detectar cambio de precio
    const ingSnap = await get(ref(db, `${LOG(branchId)}/ingredients/${item.ingredientId}`));
    const ing = ingSnap.val();
    if (ing && Math.abs(Number(ing.cost || 0) - Number(item.unitCost)) > 0.01) {
      priceChanges.push({
        ingredientId: item.ingredientId,
        name: item.name,
        oldCost: ing.cost || 0,
        newCost: Number(item.unitCost),
      });
    }
  }

  // Publicar evento para finanzas (catálogo: purchase_order.delivered)
  try {
    await pub('purchase_order.delivered', {
      purchaseOrderId: orderId,
      supplierId: order.supplierId,
      receivedBy: actor || 'system',
      deliveredAt: order.receivedAt || nowISO(),
    }, { branchId, userEmail: 'system', userRole: 'system' });
  } catch (e) {
    console.warn('[logistics] Failed to publish purchase_order.delivered:', e.message);
  }

  auditLog('logistics.purchase_order.received', { branchId, orderId, supplierName: order.supplierName, total: order.total, priceChanges: priceChanges.length }, actor);

  return { success: true, priceChanges };
}

export async function cancelPurchaseOrder(branchId, orderId, actor, reason) {
  const updates = { status: 'cancelado' };
  if (reason) {
    updates.cancelReason = reason;
    updates.cancelledBy = actor;
    updates.cancelledAt = Date.now();
  }
  await update(ref(db, `${LOG(branchId)}/purchase_orders/${orderId}`), updates);
  auditLog('logistics.purchase_order.cancelled', { branchId, orderId, reason }, actor);
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

export async function consumeRecipeIngredients(branchId, orderId, items, userEmail) {
  const recipesSnap = await get(ref(db, `${LOG(branchId)}/recipes`));
  const recipes = recipesSnap.val();
  if (!recipes) return { success: true, consumed: [] };

  const consumed = [];
  const errors = [];

  for (const item of (items || [])) {
    const prodId = item.productId || item.id;
    const qty = Number(item.quantity || 1);

    let recipe = null;
    for (const [id, r] of Object.entries(recipes)) {
      if (r.productId === prodId) { recipe = { id, ...r }; break; }
    }
    if (!recipe || !recipe.ingredients) continue;

    for (const [ingId, ing] of Object.entries(recipe.ingredients)) {
      const totalQty = Number(ing.quantity) * qty;
      const costTotal = Number(ing.unitCost) * totalQty;
      try {
        await registerMovement(branchId, {
          ingredientId: ingId,
          type: 'salida',
          quantity: totalQty,
          unit: ing.unit,
          reason: 'Consumo en pedido',
          reference: `ORDER-${orderId.slice(-6)}`,
          cost: costTotal,
          createdBy: userEmail || 'system',
        });
        consumed.push({ ingredientId: ingId, name: ing.name, quantity: totalQty, cost: costTotal });
      } catch (e) {
        errors.push({ ingredientId: ingId, error: e.message });
      }
    }
  }

  try {
    await pub('inventory.consumed', { orderId, items: consumed }, {
      branchId, userEmail: userEmail || 'system', userRole: 'system',
    });
  } catch (e) {
    console.warn('[logistics] Failed to publish inventory.consumed:', e.message);
  }

  return { success: errors.length === 0, consumed, errors };
}

export async function getAvailableServings(branchId, productId) {
  const recipesSnap = await get(ref(db, `${LOG(branchId)}/recipes`));
  const recipes = recipesSnap.val();
  if (!recipes) return { servings: 0, limitingIngredient: null };

  let recipe = null;
  for (const [id, r] of Object.entries(recipes)) {
    if (r.productId === productId) { recipe = { id, ...r }; break; }
  }
  if (!recipe || !recipe.ingredients) return { servings: 0, limitingIngredient: null };

  const ingredientsSnap = await get(ref(db, `${LOG(branchId)}/ingredients`));
  const ingredients = ingredientsSnap.val();
  if (!ingredients) return { servings: 0, limitingIngredient: null };

  let minServings = Infinity;
  let limiting = null;

  for (const [ingId, ingData] of Object.entries(recipe.ingredients)) {
    const ing = ingredients[ingId];
    if (!ing) { minServings = 0; limiting = ingData.name; break; }
    const qtyNeeded = Number(ingData.quantity);
    if (qtyNeeded <= 0) continue;
    const possible = Math.floor(Number(ing.stock) / qtyNeeded);
    if (possible < minServings) { minServings = possible; limiting = ingData.name; }
  }

  return {
    servings: minServings === Infinity ? 0 : minServings * (recipe.yield || 1),
    limitingIngredient: limiting,
  };
}
