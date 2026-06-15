import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * When an order's status changes to 'recibido' or 'preparando',
 * send push notifications to subscribed FCM tokens for that branch.
 */
export const onOrderStatusChange = functions.database
  .ref('/branches/{branchId}/orders/{orderId}')
  .onWrite(async (change, context) => {
    const { branchId, orderId } = context.params;
    const before = change.before.val();
    const after = change.after.val();

    if (!after) return; // Deletion
    if (!before) {
      // New order — skip, we handle status-specific below
    }

    const prevStatus = before?.status;
    const newStatus = after?.status;
    if (!newStatus || newStatus === prevStatus) return;

    const triggeredStatuses = ['recibido', 'preparando', 'listo'];
    if (!triggeredStatuses.includes(newStatus)) return;

    // Build notification content
    let title = '';
    let body = '';
    let station = '';

    switch (newStatus) {
      case 'recibido':
        station = after.items?.[0]?.station || 'general';
        title = '🍽️ Nuevo Pedido';
        body = `${after.customerName || 'Cliente'} ordenó ${after.items?.length || 0} items`;
        break;
      case 'preparando':
        station = after.station || 'general';
        title = '🔔 Pedido en Preparación';
        body = `#${orderId.slice(-4)} — estación ${station}`;
        break;
      case 'listo':
        station = 'expo';
        title = '✅ Pedido Listo';
        body = `#${orderId.slice(-4)} listo para despachar`;
        break;
    }

    // Fetch FCM tokens for this branch
    const tokensSnapshot = await admin.database()
      .ref(`branches/${branchId}/fcm_tokens`)
      .once('value');
    const tokensData = tokensSnapshot.val();
    if (!tokensData) return;

    const tokens = Object.values(tokensData)
      .map((entry) => entry?.token)
      .filter(Boolean);

    if (tokens.length === 0) return;

    const message = {
      notification: { title, body },
      data: {
        orderId,
        branchId,
        station,
        status: newStatus,
        clickAction: `https://house-menu.app/cocina?order=${orderId}`,
      },
      tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Sent ${response.successCount}/${tokens.length} notifications for order ${orderId}`);
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  });
