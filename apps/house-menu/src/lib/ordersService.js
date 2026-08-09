import { ref, push, set, onValue, update, get, runTransaction, serverTimestamp } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, getSessionId } from '@house/db';
import { realtimeDB as db } from '@house/db';
import { ordersPath, ordersStatusPath, ordersUpdatedAtPath, catalogProductsPath } from './paths';
import { nowISO, dateKey } from './format';
import { auditLog } from './auditService';

const functions = getFunctions(app);

function isFutureDate(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const target = new Date(dateStr + 'T23:59:59');
  return target > today;
}

function walkOptionInProduct(product, optId, fn) {
  const steps = product.steps;
  if (!steps) return false;
  const stepKeys = Object.keys(steps);
  for (const si of stepKeys) {
    const step = steps[si];
    const opts = step?.options;
    if (!opts) continue;
    const optKeys = Object.keys(opts);
    for (const oi of optKeys) {
      if ((opts[oi].id || opts[oi]) === optId) {
        fn(opts[oi]);
        return true;
      }
    }
  }
  return false;
}

// ── Sequential order numbering ──
async function getNextOrderCode(branchId, branchPrefix) {
  try {
    const date = dateKey();
    const counterRef = ref(db, `branches/${branchId}/counters/orders/${date}`);
    const result = await runTransaction(counterRef, (current) => (current || 0) + 1);
    if (!result.committed) throw new Error('Counter transaction failed');
    const seq = result.snapshot.val();
    const prefix = (branchPrefix || branchId || '').slice(0, 3).toUpperCase();
    return {
      shortCode: `${prefix}-${String(seq).padStart(3, '0')}`,
      displayId: `#${prefix}-${String(seq).padStart(3, '0')}`,
      sequentialNumber: seq,
    };
  } catch (err) {
    console.warn('getNextOrderCode fallback (no counter):', err.message);
    return null; // fallback — order works without shortCode
  }
}

function buildWizardOptMap(items) {
  const map = {}; // { productId: { optionId: totalQty } }
  for (const item of items || []) {
    const prodId = item.productId || item.id;
    const qty = Number(item.quantity || 1);
    if (item.wizardSelections && typeof item.wizardSelections === 'object') {
      if (!map[prodId]) map[prodId] = {};
      Object.entries(item.wizardSelections).forEach(([, selection]) => {
        const optIds = Array.isArray(selection) ? selection : [selection];
        optIds.forEach(optId => {
          map[prodId][optId] = (map[prodId][optId] || 0) + qty;
        });
      });
    }
  }
  return map;
}

export const ordersService = {
  /**
   * Crear un nuevo pedido — intenta via Cloud Function, fallback a client-side
   * @param {string} branchId - ID de la sucursal
   * @param {Object} orderData Datos del pedido (cliente, items, total)
   */
  async createOrder(branchId, orderData, userEmail) {
    try {
      const deliveryDate = orderData.deliveryDate || null;
      const isScheduled = deliveryDate && isFutureDate(deliveryDate);

      if (isScheduled) {
        const ordersRef = ref(db, ordersPath(branchId));
        const newOrderRef = push(ordersRef);
        const code = await getNextOrderCode(branchId, orderData.branchPrefix);
        const now = nowISO();

      const order = {
        ...orderData,
        id: newOrderRef.key,
        status: 'programado',
        deliveryDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        _createdAt_client: now,
        ...(code && { shortCode: code.shortCode, displayId: code.displayId, sequentialNumber: code.sequentialNumber }),
        ...(userEmail && { createdBy: userEmail }),
        sessionId: getSessionId(),
        transitions: [{
          from: null,
          to: 'programado',
          at: serverTimestamp(),
          by: userEmail || 'system',
        }],
      };

      await set(newOrderRef, order);
      return { success: true, orderId: newOrderRef.key };
      }

      const qtyMap = {};
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const prodId = item.productId || item.id;
          if (prodId) {
            qtyMap[prodId] = (qtyMap[prodId] || 0) + Number(item.quantity || 1);
          }
        }
      }

      // ── Gestión de stock (opcional — falla silenciosamente sin permisos) ──
      let stockManaged = false;
      try {
        const productsRef = ref(db, catalogProductsPath(branchId));
        let stockError = null;

        const transactionResult = await runTransaction(productsRef, (products) => {
          if (!products) return products;
          for (const [prodId, qtyNeeded] of Object.entries(qtyMap)) {
            const product = products[prodId];
            if (product && (product.trackStock === true || product.trackStock === 'true')) {
              const currentStock = Number(product.stock || 0);
              if (currentStock < qtyNeeded) {
                stockError = `Stock insuficiente para ${product.name}. Disp: ${currentStock}, Solicitado: ${qtyNeeded}`;
                return;
              }
            }
          }

          const wizardOptMap = buildWizardOptMap(orderData.items);
          for (const [prodId, optMap] of Object.entries(wizardOptMap)) {
            const product = products[prodId];
            if (!product) continue;
            for (const [optId, qtyNeeded] of Object.entries(optMap)) {
              walkOptionInProduct(product, optId, (opt) => {
                if ((opt.trackStock === true || opt.trackStock === 'true') && Number(opt.stock || 0) < qtyNeeded) {
                  stockError = `Stock insuficiente para "${opt.name}".`;
                }
              });
              if (stockError) return;
            }
          }

          for (const [prodId, qtyNeeded] of Object.entries(qtyMap)) {
            const product = products[prodId];
            if (product && (product.trackStock === true || product.trackStock === 'true')) {
              const currentStock = Number(product.stock || 0);
              const newStock = Math.max(0, currentStock - qtyNeeded);
              product.stock = newStock;
              if (newStock <= 0) product.available = false;
            }
          }

          for (const [prodId, optMap] of Object.entries(wizardOptMap)) {
            const product = products[prodId];
            if (!product) continue;
            for (const [optId, qtyNeeded] of Object.entries(optMap)) {
              walkOptionInProduct(product, optId, (opt) => {
                if (opt.trackStock === true || opt.trackStock === 'true') {
                  opt.stock = Math.max(0, Number(opt.stock || 0) - qtyNeeded);
                }
              });
            }
          }

          return products;
        });

        if (!transactionResult.committed) {
          return {
            success: false,
            error: 'stock_insufficient',
            message: stockError || 'Stock insuficiente o modificado.'
          };
        }
        stockManaged = true;
      } catch (stockErr) {
        // Si el usuario no tiene permisos para manage stock (anónimos, kiosko),
        // ignoramos el error y creamos la orden igual
        console.warn('Stock management skipped (no permissions):', stockErr.message);
      }

      const ordersRef = ref(db, ordersPath(branchId));
      const newOrderRef = push(ordersRef);
      const code = await getNextOrderCode(branchId, orderData.branchPrefix);
      const now = nowISO();

      // Si el pago requiere verificación (Yape/Plin), la orden no va a cocina todavía
      const initialStatus = orderData.payment_status === 'por_verificar' ? 'pendiente_pago' : 'recibido';

      const order = {
        ...orderData,
        id: newOrderRef.key,
        status: initialStatus,
        deliveryDate: deliveryDate || nowISO().split('T')[0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        _createdAt_client: now,
        ...(code && { shortCode: code.shortCode, displayId: code.displayId, sequentialNumber: code.sequentialNumber }),
        ...(userEmail && { createdBy: userEmail }),
        sessionId: getSessionId(),
        transitions: [{
          from: null,
          to: initialStatus,
          at: serverTimestamp(),
          by: userEmail || 'system',
        }],
      };

      const sessionId = getSessionId();
      await set(newOrderRef, order);
      // Link order to session so "Mis pedidos" works in the tracker
      if (sessionId) {
        try {
          const sessionRef = ref(db, `branches/${branchId}/orders_by_session/${sessionId}/${newOrderRef.key}`);
          await set(sessionRef, true);
        } catch (sessionErr) {
          console.warn('Failed to link order to session:', sessionErr);
        }
      }

      // ── Auto-consumo de insumos desde recetas ──
      if (initialStatus === 'recibido' && orderData.items?.length > 0) {
        try {
          const { consumeRecipeIngredients } = await import('./logisticsService');
          consumeRecipeIngredients(branchId, newOrderRef.key, orderData.items, userEmail)
            .catch(e => console.warn('[orders] Auto-consumo falló (no crítico):', e.message));
        } catch (e) {
          console.warn('[orders] No se pudo importar consumeRecipeIngredients:', e.message);
        }
      }

      auditLog('order.created', {
        orderId: newOrderRef.key,
        total: orderData.total,
        source: orderData.source || 'unknown',
        payment_method: orderData.payment_method,
        payment_status: orderData.payment_status,
        itemCount: orderData.items?.length,
        customerName: orderData.customerName,
      }, userEmail || 'system');

      return { success: true, orderId: newOrderRef.key };
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Verificar pago Yape/Plin: cambia payment_status → 'pagado' y status → 'recibido'
   * para que la cocina vea el pedido.
   */
  async verifyPayment(branchId, orderId, verifierEmail) {
    try {
      const orderRef = ref(db, `${ordersPath(branchId)}/${orderId}`);
      await update(orderRef, {
        payment_status: 'pagado',
        status: 'recibido',
        payment_verified_at: serverTimestamp(),
        payment_verified_by: verifierEmail || 'system',
        collectedAt: serverTimestamp(),
        collectedBy: verifierEmail || 'system',
        updatedAt: serverTimestamp(),
      });

      auditLog('order.payment_verified', {
        orderId,
        method: 'Yape/Plin',
      }, verifierEmail || 'system');

      return { success: true };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Confirmar pago desde despacho/caja sin alterar el flujo del pedido.
   * A diferencia de verifyPayment, NO cambia status (el pedido ya está en cocina/despacho).
   */
  async confirmPayment(branchId, orderId, verifierEmail) {
    try {
      const orderRef = ref(db, `${ordersPath(branchId)}/${orderId}`);
      await update(orderRef, {
        payment_status: 'pagado',
        payment_verified_at: serverTimestamp(),
        payment_verified_by: verifierEmail || 'system',
        updatedAt: serverTimestamp(),
      });

      auditLog('order.payment_confirmed', {
        orderId,
        from: 'dispatch_or_cashier',
      }, verifierEmail || 'system');

      return { success: true };
    } catch (error) {
      console.error('Error confirming payment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Suscribirse a todos los pedidos (para la vista de cocina)
   * @param {string} branchId - ID de la sucursal
   * @param {Function} callback Función que recibe el array de pedidos actualizados
   */
  subscribeToOrders(branchId, callback) {
    const ordersRef = ref(db, ordersPath(branchId));
    return onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }
      
      // Convertir el objeto de Firebase a array y ordenar por fecha (más reciente al final o al inicio según prefieran)
      const ordersArray = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })).sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      });
      
      callback(ordersArray);
    });
  },

  /**
   * Actualizar el estado de un pedido
   * @param {string} branchId ID de la sucursal
   * @param {string} orderId ID del pedido
   * @param {string} newStatus Nuevo estado ('preparando', 'listo', 'entregado', 'cancelado')
   */
   async updateOrderStatus(branchId, orderId, newStatus, userEmail, cancelReason) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));

      // Revert stock if the order is being cancelled
      if (newStatus === 'cancelado') {
        const orderSnapshot = await get(orderRef);
        if (orderSnapshot.exists()) {
          const order = orderSnapshot.val();
          if (order.status !== 'cancelado') {
            // Aggregate items quantities
            const qtyMap = {};
            if (order.items && order.items.length > 0) {
              for (const item of order.items) {
                const prodId = item.productId || item.id;
                if (prodId) {
                  qtyMap[prodId] = (qtyMap[prodId] || 0) + Number(item.quantity || 1);
                }
              }
            }

            // Revert stock atomically
            const productsRef = ref(db, catalogProductsPath(branchId));
            await runTransaction(productsRef, (products) => {
              if (!products) return products;

              // Revert product-level stock
              for (const [prodId, qtyToRevert] of Object.entries(qtyMap)) {
                const product = products[prodId];
                if (product && (product.trackStock === true || product.trackStock === 'true')) {
                  const currentStock = Number(product.stock || 0);
                  const newStock = currentStock + qtyToRevert;
                  product.stock = newStock;
                  if (newStock > 0 && product.available === false) {
                    product.available = true;
                  }
                }
              }

              // Revert option-level stock for wizard products
              const wizardOptMap = buildWizardOptMap(order.items);
              for (const [prodId, optMap] of Object.entries(wizardOptMap)) {
                const product = products[prodId];
                if (!product) continue;
                for (const [optId, qtyRevert] of Object.entries(optMap)) {
                  walkOptionInProduct(product, optId, (opt) => {
                    if (opt.trackStock === true || opt.trackStock === 'true') {
                      opt.stock = Number(opt.stock || 0) + qtyRevert;
                    }
                  });
                }
              }

              return products;
            });
          }
        }
      }

      // ponytail: cancel doesn't revert ingredient consumption
      // Reverting would need to know if ingredients were actually consumed

      const oldStatus = (await get(orderRef)).val()?.status;
      const transition = {
        from: oldStatus || null,
        to: newStatus,
        at: serverTimestamp(),
        by: userEmail || 'system',
        ...(cancelReason && { reason: cancelReason }),
      };
      // Read current transitions and append
      const currentOrder = (await get(orderRef)).val() || {};
      const transitions = [...(currentOrder.transitions || []), transition];

      const updates = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        transitions,
        ...(userEmail && { updatedBy: userEmail }),
      };
      if (userEmail && newStatus === 'cancelado') updates.canceledBy = userEmail;
      if (newStatus === 'cancelado' && cancelReason) updates.cancelReason = cancelReason;
      await update(orderRef, updates);

      auditLog('order.status_changed', {
        orderId,
        from: oldStatus,
        to: newStatus,
        reason: cancelReason || null,
      }, userEmail || 'system');

      return { success: true };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { success: false, error };
    }
  },

  /**
   * Actualizar el estado de múltiples pedidos a la vez
   * @param {string} branchId ID de la sucursal
   * @param {string[]} orderIds Array de IDs de pedidos
   * @param {string} newStatus Nuevo estado
   */
  async batchUpdateOrderStatus(branchId, orderIds, newStatus) {
    try {
      const updates = {};
      orderIds.forEach((orderId) => {
        updates[ordersStatusPath(branchId, orderId)] = newStatus;
        updates[ordersUpdatedAtPath(branchId, orderId)] = serverTimestamp();
      });
      await update(ref(db), updates);
      return { success: true, updatedCount: orderIds.length };
    } catch (error) {
      console.error('Error batch updating order status:', error);
      return { success: false, error };
    }
  },

  /**
   * Rechazar un pago Yape/Plin — revierte a pendiente
   */
  async rejectPayment(branchId, orderId, reason, rejectedBy) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
      await update(orderRef, {
        payment_status: 'pendiente',
        payment_rejected: {
          reason: reason || 'Sin motivo',
          rejectedAt: serverTimestamp(),
          rejectedBy: rejectedBy || 'admin',
        },
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error rejecting payment:', error);
      return { success: false, error };
    }
  },

  /**
   * Marcar un pedido Contraentrega como pagado en la entrega (por el repartidor)
   */
  async markAsPaidOnDelivery(branchId, orderId, driverEmail, driverName) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
const updates = {
        payment_status: 'pagado',
        status: 'entregado',
        paidAt: serverTimestamp(),
        collectedAt: serverTimestamp(),
        collectedBy: driverEmail,
        collectedByName: driverName,
        updatedAt: serverTimestamp(),
        updatedBy: driverEmail,
      };
      await update(orderRef, updates);

      auditLog('order.paid_on_delivery', {
        orderId,
        driver: driverEmail || 'driver',
        driverName: driverName || 'Repartidor',
      }, driverEmail || 'driver');

      return { success: true };
    } catch (error) {
      console.error('Error marking order as paid on delivery:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Marcar un pedido Pendiente como pagado
   */
  async markAsPaid(branchId, orderId, paymentMethod, userEmail, discount) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
      const updates = {
        payment_method: paymentMethod,
        payment_status: 'pagado',
        status: 'recibido',
        paidAt: serverTimestamp(),
        collectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(userEmail && { paidBy: userEmail, collectedBy: userEmail }),
      };
      if (discount) {
        updates.discount = discount;
        updates.totalAfterDiscount = discount.type === 'percentage'
          ? Math.max(0, discount.originalTotal * (1 - Math.min(discount.value, 100) / 100))
          : Math.max(0, discount.originalTotal - discount.value);
      }
      await update(orderRef, updates);

      auditLog('order.marked_paid', {
        orderId,
        method: paymentMethod,
        discount: discount || null,
      }, userEmail || 'system');

      return { success: true };
    } catch (error) {
      console.error('Error marking order as paid:', error);
      return { success: false, error };
    }
  },

  async addOrderNote(branchId, orderId, note, userEmail, displayName) {
    try {
      const noteEntry = {
        text: typeof note === 'string' ? note : '',
        createdBy: userEmail || 'admin',
        createdByName: displayName || userEmail || 'admin',
        createdAt: serverTimestamp(),
      };
      const orderRef = ref(db, ordersPath(branchId, orderId));
      const snapshot = await get(orderRef);
      const existing = snapshot.val() || {};
      const notes = Array.isArray(existing.notes) ? [...existing.notes, noteEntry] : [noteEntry];
      await update(orderRef, {
        notes,
        ...(userEmail && { notedBy: userEmail }),
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error adding order note:', error);
      return { success: false, error };
    }
  },

  /**
   * Actualiza los items de un pedido (sobrescribe items, financials, total)
   */
  async updateOrderItems(branchId, orderId, { items, financials, total }, userEmail) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
      const updates = { items, updatedAt: serverTimestamp() };
      if (financials) updates.financials = financials;
      if (total !== undefined) updates.total = total;
      if (userEmail) updates.editedBy = userEmail;
      await update(orderRef, updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating order items:', error);
      return { success: false, error };
    }
  },

  /**
   * Procesa un reembolso total o parcial
   */
  async processRefund(branchId, orderId, refundData, userEmail) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
      const refund = {
        amount: refundData.amount,
        method: refundData.method,
        reason: refundData.reason || '',
        processedAt: serverTimestamp(),
        processedBy: refundData.processedBy || userEmail || 'admin',
      };
      await update(orderRef, {
        refund,
        payment_status: 'reembolsado',
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error processing refund:', error);
      return { success: false, error };
    }
  },

  async updateOrderPriority(branchId, orderId, priority, userEmail) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
      await update(orderRef, { priority, updatedAt: serverTimestamp(), updatedBy: userEmail || 'system' });
      return { success: true };
    } catch (error) {
      console.error('Error updating order priority:', error);
      return { success: false, error };
    }
  },

  /**
   * Obtiene un pedido individual por ID (una sola vez, sin suscripción)
   */
  async getOrder(branchId, orderId) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
      const snap = await get(orderRef);
      if (!snap.exists()) return null;
      return { id: snap.key, ...snap.val() };
    } catch (error) {
      console.error('Error getting order:', error);
      return null;
    }
  },

  /**
   * Suscribirse a un solo pedido (para la vista de cliente / rastreo)
   * @param {string} branchId ID de la sucursal
   * @param {string} orderId ID del pedido a rastrear
   * @param {Function} callback Función que recibe el objeto del pedido actualizado
   */
  subscribeToOrder(branchId, orderId, callback) {
    const orderRef = ref(db, ordersPath(branchId, orderId));
    return onValue(orderRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback(null);
        return;
      }
      callback({
        id: snapshot.key,
        ...data
      });
    });
  },

};
