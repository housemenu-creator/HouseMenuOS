import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const rtdb = admin.database();

/**
 * Callable function: processOrder
 * Valida stock y deduce inventario atómicamente desde el servidor.
 * Reemplaza el `runTransaction` client-side en ordersService.createOrder.
 */
export const processOrder = functions.https.onCall(async (data) => {
  const { branchId, orderData } = data;

  if (!branchId || !orderData) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Se requieren branchId y orderData'
    );
  }

  const items = orderData.items || [];
  if (items.length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'El pedido debe tener al menos un item'
    );
  }

  // 1. Aggregate quantities by productId
  const qtyMap: Record<string, number> = {};
  for (const item of items) {
    const prodId = item.productId || item.id;
    if (prodId) {
      qtyMap[prodId] = (qtyMap[prodId] || 0) + Number(item.quantity || 1);
    }
  }

  const productsRef = rtdb.ref(`branches/${branchId}/catalog/products`);

  try {
    // 2. Atomic stock validation + deduction via transaction
    const result = await productsRef.transaction((products) => {
      if (!products) return products;

      for (const [prodId, qtyNeeded] of Object.entries(qtyMap)) {
        const product = products[prodId];
        if (product && product.trackStock === true) {
          const currentStock = Number(product.stock || 0);
          if (currentStock < qtyNeeded) {
            return; // abort - insufficient stock
          }
        }
      }

      for (const [prodId, qtyNeeded] of Object.entries(qtyMap)) {
        const product = products[prodId];
        if (product && product.trackStock === true) {
          const currentStock = Number(product.stock || 0);
          const newStock = Math.max(0, currentStock - qtyNeeded);
          product.stock = newStock;
          if (newStock <= 0) {
            product.available = false;
          }
        }
      }

      return products;
    });

    if (!result.committed) {
      // Find which product caused the failure
      let errorMsg = 'Stock insuficiente.';
      const snapshot = await productsRef.once('value');
      const products = snapshot.val();
      if (products) {
        for (const [prodId, qtyNeeded] of Object.entries(qtyMap)) {
          const product = products[prodId];
          if (product && product.trackStock === true) {
            const currentStock = Number(product.stock || 0);
            if (currentStock < qtyNeeded) {
              errorMsg = `Stock insuficiente para ${product.name}. Disponible: ${currentStock}, Solicitado: ${qtyNeeded}`;
              break;
            }
          }
        }
      }

      return { success: false, error: 'stock_insufficient', message: errorMsg };
    }

    // 3. Create the order in RTDB
    const ordersRef = rtdb.ref(`branches/${branchId}/orders`);
    const newOrderRef = ordersRef.push();
    const timestamp = new Date().toISOString();

    const order = {
      ...orderData,
      id: newOrderRef.key,
      status: 'recibido',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await newOrderRef.set(order);

    return { success: true, orderId: newOrderRef.key };
  } catch (error) {
    console.error('processOrder error:', error);
    throw new functions.https.HttpsError('internal', 'Error al procesar el pedido');
  }
});

/**
 * Callable function: cancelOrder
 * Revierte el stock cuando se cancela un pedido.
 */
export const cancelOrder = functions.https.onCall(async (data) => {
  const { branchId, orderId } = data;

  if (!branchId || !orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Se requieren branchId y orderId');
  }

  const orderRef = rtdb.ref(`branches/${branchId}/orders/${orderId}`);

  try {
    const orderSnapshot = await orderRef.once('value');
    if (!orderSnapshot.exists()) {
      return { success: false, error: 'Orden no encontrada' };
    }

    const order = orderSnapshot.val();
    if (order.status === 'cancelado') {
      return { success: false, error: 'La orden ya está cancelada' };
    }

    // Aggregate items
    const qtyMap: Record<string, number> = {};
    const items = order.items || [];
    for (const item of items) {
      const prodId = item.productId || item.id;
      if (prodId) {
        qtyMap[prodId] = (qtyMap[prodId] || 0) + Number(item.quantity || 1);
      }
    }

    // Revert stock atomically
    if (Object.keys(qtyMap).length > 0) {
      const productsRef = rtdb.ref(`branches/${branchId}/catalog/products`);
      await productsRef.transaction((products) => {
        if (!products) return products;
        for (const [prodId, qtyToRevert] of Object.entries(qtyMap)) {
          const product = products[prodId];
          if (product && product.trackStock === true) {
            const currentStock = Number(product.stock || 0);
            product.stock = currentStock + qtyToRevert;
            if (product.stock > 0 && product.available === false) {
              product.available = true;
            }
          }
        }
        return products;
      });
    }

    // Update order status
    await orderRef.update({
      status: 'cancelado',
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('cancelOrder error:', error);
    throw new functions.https.HttpsError('internal', 'Error al cancelar el pedido');
  }
});
