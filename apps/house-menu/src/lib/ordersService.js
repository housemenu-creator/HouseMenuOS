import { ref, push, set, onValue, update, get, runTransaction } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, getSessionId } from '@house/db';
import { realtimeDB as db } from '@house/db';
import { ordersPath, ordersStatusPath, ordersUpdatedAtPath, catalogProductsPath } from './paths';
import { nowISO } from './format';

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
        const timestamp = nowISO();

      const order = {
        ...orderData,
        id: newOrderRef.key,
        status: 'programado',
        deliveryDate,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...(userEmail && { createdBy: userEmail }),
        sessionId: getSessionId(),
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
      const timestamp = nowISO();

      // Si el pago requiere verificación (Yape/Plin), la orden no va a cocina todavía
      const initialStatus = orderData.payment_status === 'por_verificar' ? 'pendiente_pago' : 'recibido';

      const order = {
        ...orderData,
        id: newOrderRef.key,
        status: initialStatus,
        deliveryDate: deliveryDate || nowISO().split('T')[0],
        createdAt: timestamp,
        updatedAt: timestamp,
        ...(userEmail && { createdBy: userEmail }),
        sessionId: getSessionId(),
      };

      await set(newOrderRef, order);
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
        payment_verified_at: nowISO(),
        payment_verified_by: verifierEmail || 'system',
      });
      return { success: true };
    } catch (error) {
      console.error('Error verifying payment:', error);
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
  async updateOrderStatus(branchId, orderId, newStatus, userEmail) {
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

      const updates = {
        status: newStatus,
        updatedAt: nowISO(),
        ...(userEmail && { updatedBy: userEmail }),
      };
      if (userEmail && newStatus === 'cancelado') updates.canceledBy = userEmail;
      await update(orderRef, updates);
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
      const timestamp = nowISO();
      const updates = {};
      orderIds.forEach((orderId) => {
        updates[ordersStatusPath(branchId, orderId)] = newStatus;
        updates[ordersUpdatedAtPath(branchId, orderId)] = timestamp;
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
          rejectedAt: nowISO(),
          rejectedBy: rejectedBy || 'admin',
        },
        updatedAt: nowISO(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error rejecting payment:', error);
      return { success: false, error };
    }
  },

  /**
   * Marcar un pedido Pendiente como pagado
   */
  async markAsPaid(branchId, orderId, paymentMethod, userEmail) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
      await update(orderRef, {
        payment_method: paymentMethod,
        payment_status: 'pagado',
        status: 'recibido',   // libera la orden a cocina si estaba pendiente_pago
        paidAt: nowISO(),
        updatedAt: nowISO(),
        ...(userEmail && { paidBy: userEmail }),
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking order as paid:', error);
      return { success: false, error };
    }
  },

  /**
   * Agrega o actualiza una nota interna en un pedido
   */
  async addOrderNote(branchId, orderId, note, userEmail) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
      await update(orderRef, {
        internalNote: note,
        ...(userEmail && { notedBy: userEmail }),
        updatedAt: nowISO(),
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
      const updates = { items, updatedAt: nowISO() };
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
        processedAt: nowISO(),
        processedBy: refundData.processedBy || userEmail || 'admin',
      };
      await update(orderRef, {
        refund,
        payment_status: 'reembolsado',
        updatedAt: nowISO(),
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
      await update(orderRef, { priority, updatedAt: nowISO(), updatedBy: userEmail || 'system' });
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
  }
};
