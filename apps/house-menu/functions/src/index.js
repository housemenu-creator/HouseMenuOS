/**
 * House Menu — Firebase Cloud Functions
 *
 * FCM Sender:
 *   Escucha escrituras en branches/{branchId}/notifications/{userId}/{notifId}
 *   y envía push notifications via Firebase Admin SDK a los tokens FCM
 *   registrados en branches/{branchId}/fcm_tokens/{userId}.
 *
 * Email Sender:
 *   Escucha nuevas órdenes en branches/{branchId}/orders/{orderId}
 *   y envía email de confirmación al cliente via Resend.
 *
 * Requiere:
 *   - Firebase project en plan Blaze (Cloud Functions)
 *   - Service account con permisos de Cloud Messaging
 *   - Resend API Key configurada como: firebase functions:config:set resend.api_key="re_xxx"
 *   - firebase-tools para deploy: firebase deploy --only functions
 */
import { onValueWritten } from 'firebase-functions/v2/database';
import { logger, config } from 'firebase-functions';
import admin from 'firebase-admin';
import { Resend } from 'resend';

admin.initializeApp();

const db = admin.database();

// ── Email helper ─────────────────────────────────────────

function buildOrderEmailHtml(order, branchName) {
  const items = order.items || [];
  const total = order.financials?.total ?? items.reduce((s, i) => s + (i.price || 0), 0);
  const orderCode = order.id?.slice(-6).toUpperCase() || '';
  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('es-PE', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : new Date().toLocaleDateString('es-PE');

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 6px 0; border-bottom: 1px solid #eee; font-size: 13px;">
        <strong>${item.name}</strong>
        ${item.details?.length ? `<br><span style="color:#888;font-size:11px;">${item.details.join(', ')}</span>` : ''}
      </td>
      <td style="padding: 6px 0; border-bottom: 1px solid #eee; text-align: right; font-size: 13px; white-space: nowrap;">
        S/ ${(item.price || 0).toFixed(2)}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
      <!-- Header -->
      <tr><td style="background:#171717;padding:28px 24px;text-align:center;">
        <h1 style="color:#fff;margin:0 0 4px;font-size:22px;">¡Pedido Confirmado!</h1>
        <p style="color:rgba(255,255,255,0.7);margin:0;font-size:13px;">${branchName || 'House Menu'}</p>
      </td></tr>
      <!-- Order code -->
      <tr><td style="padding:20px 24px;text-align:center;border-bottom:1px solid #eee;">
        <p style="color:#888;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Código de seguimiento</p>
        <p style="font-size:28px;font-weight:800;color:#171717;margin:0;letter-spacing:2px;font-family:monospace;">#${orderCode}</p>
      </td></tr>
      <!-- Date -->
      <tr><td style="padding:12px 24px;text-align:center;color:#888;font-size:12px;">${date}</td></tr>
      <!-- Items -->
      <tr><td style="padding:0 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${itemsHtml}
        </table>
      </td></tr>
      <!-- Total -->
      <tr><td style="padding:16px 24px 20px;border-top:2px dashed #ddd;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:16px;font-weight:700;">TOTAL</td>
            <td style="text-align:right;font-size:18px;font-weight:800;color:#171717;">S/ ${total.toFixed(2)}</td>
          </tr>
        </table>
      </td></tr>
      <!-- Info -->
      <tr><td style="padding:0 24px 8px;font-size:12px;color:#888;">
        <p>Podés rastrear tu pedido en vivo desde la app con el código <strong>#${orderCode}</strong>.</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f9f9f9;padding:16px 24px;text-align:center;border-top:1px solid #eee;">
        <p style="margin:0;font-size:11px;color:#aaa;">Gracias por tu pedido 💛</p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}

// ── Send Order Confirmation Email ────────────────────────

export const sendOrderConfirmationEmail = onValueWritten(
  {
    ref: 'branches/{branchId}/orders/{orderId}',
    region: 'us-central1',
  },
  async (event) => {
    const { branchId, orderId } = event.params;

    // Solo en creación, no en update
    const before = event.data.before.val();
    const after = event.data.after.val();

    if (before) {
      logger.debug(`Orden ${orderId} ya existía, skip email.`);
      return;
    }

    if (!after) {
      logger.debug(`Orden ${orderId} eliminada, skip email.`);
      return;
    }

    const customerEmail = after.customerEmail;
    if (!customerEmail) {
      logger.info(`Orden ${orderId} sin email de cliente, skip.`);
      return;
    }

    // Obtener nombre de la sucursal
    let branchName = branchId;
    try {
      const branchSnap = await db.ref(`branches/${branchId}/name`).once('value');
      if (branchSnap.exists()) branchName = branchSnap.val();
    } catch (e) {
      logger.warn(`No se pudo leer nombre de sucursal ${branchId}:`, e);
    }

    // Obtener API key de Resend desde config
    const resendApiKey = config().resend?.api_key;
    if (!resendApiKey) {
      logger.warn('RESEND_API_KEY no configurada. Ejecutar: firebase functions:config:set resend.api_key="re_xxx"');
      return;
    }

    const resend = new Resend(resendApiKey);

    const html = buildOrderEmailHtml(after, branchName);
    const orderCode = after.id?.slice(-6).toUpperCase() || orderId.slice(-6).toUpperCase();

    try {
      const result = await resend.emails.send({
        from: 'House Menu <pedidos@houseportal.pe>',
        to: customerEmail,
        subject: `✅ Pedido confirmado #${orderCode} — ${branchName}`,
        html,
      });

      logger.info(`Email de confirmación enviado a ${customerEmail} para orden ${orderId}:`, result.id);
    } catch (error) {
      logger.error(`Error enviando email para orden ${orderId}:`, error);
    }
  }
);

/**
 * Envía push notification cuando se escribe una nueva notificación en RTDB.
 * Lee el token FCM del usuario desde branches/{branchId}/fcm_tokens/{userId}.
 */
export const sendNotificationPush = onValueWritten(
  {
    ref: 'branches/{branchId}/notifications/{userId}/{notifId}',
    region: 'us-central1',
  },
  async (event) => {
    const { branchId, userId, notifId } = event.params;

    // Solo interesa la creación (data existe antes? no → es nueva)
    const before = event.data.before.val();
    const after = event.data.after.val();

    if (before) {
      // Ya existía — es un update, no un create. Skip.
      logger.debug(`Notificación ${notifId} ya existía, skip.`);
      return;
    }

    if (!after) {
      logger.debug(`Notificación ${notifId} eliminada, skip.`);
      return;
    }

    const { title, body, type, orderId, url } = after;

    if (!title) {
      logger.warn(`Notificación ${notifId} sin título, skip.`);
      return;
    }

    // Buscar tokens FCM del usuario
    const tokensSnapshot = await db
      .ref(`branches/${branchId}/fcm_tokens/${userId}`)
      .once('value');

    const tokenData = tokensSnapshot.val();

    if (!tokenData) {
      logger.info(
        `Usuario ${userId} no tiene tokens FCM registrados, skip push.`
      );
      return;
    }

    // tokenData puede ser un objeto { token: '...', platform: 'web' }
    // o puede haber múltiples tokens por usuario
    const tokens = collectTokens(tokenData);

    if (tokens.length === 0) {
      logger.info(`Usuario ${userId} sin tokens válidos, skip push.`);
      return;
    }

    const message = {
      notification: {
        title,
        body: body || '',
      },
      data: {
        type: type || 'system',
        orderId: orderId || '',
        url: url || '',
        notifId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      // Para web, usamos /menu-app/ como scope del service worker
      webpush: {
        fcmOptions: {
          link: url || '/menu-app/',
        },
        notification: {
          icon: '/menu-app/logo.jpg',
          badge: '/menu-app/favicon.svg',
        },
      },
    };

    try {
      const response = await admin.messaging().sendEach(
        tokens.map((token) => ({ ...message, token }))
      );

      const successCount = response.responses.filter((r) => r.success).length;
      const failureCount = response.responses.filter((r) => !r.success).length;

      logger.info(
        `Push enviado para notificación ${notifId}: ` +
          `${successCount} exitoso(s), ${failureCount} fallido(s)`
      );

      // Si algún token falló con not-found o invalid, se podría limpiar
      for (let i = 0; i < response.responses.length; i++) {
        const resp = response.responses[i];
        if (
          !resp.success &&
          resp.error?.code === 'messaging/registration-token-not-registered'
        ) {
          logger.warn(
            `Token no registrado para usuario ${userId}, se debería limpiar.`
          );
          // Opcional: eliminar el token inválido
        }
      }
    } catch (error) {
      logger.error(`Error enviando push para notificación ${notifId}:`, error);
    }
  }
);

// ── Comm message → Notification ───────────────────────────

/**
 * Channel→roles mapping. Must match frontend COMM_CHANNEL_CONFIG.
 */
const COMM_CHANNEL_ROLES = {
  general: ['admin', 'superadmin', 'kitchen', 'mozo', 'delivery', 'cajero', 'vendedor', 'dispatch'],
  kitchen: ['admin', 'superadmin', 'kitchen'],
  cash: ['admin', 'superadmin', 'cajero', 'delivery'],
  admin: ['admin', 'superadmin'],
};

/**
 * Notify channel members when a new comm message is sent.
 * Excludes the sender from receiving their own notification.
 */
export const onCommMessageWrite = onValueWritten(
  {
    ref: 'branches/{branchId}/comm/{channel}/messages/{messageId}',
    region: 'us-central1',
  },
  async (event) => {
    const { branchId, channel, messageId } = event.params;

    // Solo en creación
    if (event.data.before.val()) {
      logger.debug(`Mensaje ${messageId} ya existía, skip.`);
      return;
    }
    const msg = event.data.after.val();
    if (!msg) {
      logger.debug(`Mensaje ${messageId} eliminado, skip.`);
      return;
    }

    // Ignorar mensajes del sistema o vacíos
    if (!msg.senderId || !msg.senderName) {
      logger.debug('Mensaje sin senderId/senderName, skip.');
      return;
    }

    // Qué roles pueden ver este canal
    const allowedRoles = COMM_CHANNEL_ROLES[channel];
    if (!allowedRoles) {
      logger.warn(`Canal desconocido: ${channel}, skip.`);
      return;
    }

    // Leer role_cache del branch para saber quién tiene cada rol
    let roleCache;
    try {
      const snap = await db.ref(`branches/${branchId}/_role_cache`).once('value');
      roleCache = snap.val() || {};
    } catch (e) {
      logger.error(`Error leyendo role_cache para ${branchId}:`, e);
      return;
    }

    // Construir lista de usuarios a notificar
    const textPreview = (msg.text || '🎤 Nota de voz').slice(0, 120);
    const notifTitle = `💬 ${msg.senderName}`;
    const notifBody = textPreview;

    const promises = [];

    for (const [userId, role] of Object.entries(roleCache)) {
      // No notificar al sender
      if (userId === msg.senderId) continue;
      // Solo roles que tienen acceso al canal
      if (!allowedRoles.includes(role)) continue;

      const notifRef = db.ref(`branches/${branchId}/notifications/${userId}`).push();
      const notifId = notifRef.key;

      const notification = {
        type: 'comm_message',
        title: notifTitle,
        body: notifBody,
        read: false,
        url: '',
        channel,
        createdAt: admin.database.ServerValue.TIMESTAMP,
        _createdAt_client: Date.now(),
      };

      promises.push(notifRef.set(notification));
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
      logger.info(
        `Comm notif: ${promises.length} notificación(es) creadas para mensaje ${messageId} en #${channel}`
      );
    } else {
      logger.debug(`Comm notif: 0 destinatarios para mensaje ${messageId} (todos ignorados o sin miembros).`);
    }
  }
);

/**
 * Extrae tokens FCM de la estructura almacenada.
 * Soporta tanto objeto simple { token: '...' } como
 * múltiples dispositivos { dev1: { token: '...' }, dev2: { token: '...' } }.
 */
function collectTokens(tokenData) {
  if (!tokenData) return [];

  // Caso: token directo { token: 'abc123' }
  if (typeof tokenData.token === 'string') {
    return [tokenData.token];
  }

  // Caso: múltiples dispositivos { deviceId: { token: '...' } }
  return Object.values(tokenData)
    .filter((entry) => entry && typeof entry.token === 'string')
    .map((entry) => entry.token);
}
