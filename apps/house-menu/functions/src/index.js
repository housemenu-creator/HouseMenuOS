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
import { onSchedule } from 'firebase-functions/v2/scheduler';
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

    // Verificar preferencia push del usuario
    const pref = await getNotifPref(branchId, userId, type || 'system');
    if (!pref.push) {
      logger.info(
        `Usuario ${userId} tiene push desactivado para ${type}, skip push.`
      );
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
      // Build messages with source key so we can clean up invalid tokens
      const messagesWithKeys = tokens.map((token) => ({ ...message, token }));
      const response = await admin.messaging().sendEach(messagesWithKeys);

      const successCount = response.responses.filter((r) => r.success).length;
      const failureCount = response.responses.filter((r) => !r.success).length;

      logger.info(
        `Push enviado para notificación ${notifId}: ` +
          `${successCount} exitoso(s), ${failureCount} fallido(s)`
      );

      // Limpiar tokens inválidos
      const cleanupPromises = [];
      for (let i = 0; i < response.responses.length; i++) {
        const resp = response.responses[i];
        if (
          !resp.success &&
          resp.error?.code === 'messaging/registration-token-not-registered'
        ) {
          const invalidToken = messagesWithKeys[i].token;
          logger.warn(`Token no registrado para usuario ${userId}, limpiando...`);
          cleanupPromises.push(removeInvalidToken(branchId, userId, invalidToken));
        }
      }

      if (cleanupPromises.length > 0) {
        await Promise.allSettled(cleanupPromises);
        logger.info(`Se limpiaron ${cleanupPromises.length} token(s) inválido(s) para usuario ${userId}`);
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

      // Verificar preferencia del usuario para comm_message
      const pref = await getNotifPref(branchId, userId, 'comm_message');
      if (!pref.enabled) {
        logger.debug(`Usuario ${userId} tiene comm_message desactivado, skip.`);
        continue;
      }

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
 * Firebase RTDB no permite ".", "#", "$", "[", "]" en keys de paths.
 * Los emails contienen "." — los encodeamos a "," que sí es válido.
 */
function safePathKey(str) {
  return str.replace(/\./g, ',').replace(/#/g, '_').replace(/[$\[\]]/g, '_');
}

/**
 * Lee las preferencias de notificación para un usuario y tipo.
 * Retorna { enabled, push, sound } con defaults si no existe.
 */
/**
 * Check if current time falls within a DND schedule.
 * Overnight ranges (start > end) are supported.
 */
function isDNDTimeActive(schedule) {
  if (!schedule || !schedule.start || !schedule.end) return false;

  const now = new Date();
  const currentDay = now.getDay() || 7; // 0=Sun → 7
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check day
  const days = schedule.days;
  if (!Array.isArray(days) || days.length === 0 || !days.includes(currentDay)) {
    return false;
  }

  // Check time
  const [startH, startM] = schedule.start.split(':').map(Number);
  const [endH, endM] = schedule.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Overnight
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

/**
 * Lee las preferencias de notificación para un usuario y tipo,
 * aplicando DND si está activo.
 *
 * Retorna { enabled, push, sound } con defaults si no existe.
 * Durante DND: push=false, sound=false.
 */
async function getNotifPref(branchId, userId, type) {
  try {
    const key = safePathKey(userId);
    const snap = await db
      .ref(`branches/${branchId}/notification_preferences/${key}/${type}`)
      .once('value');
    const prefs = snap.val();
    const result = prefs
      ? {
          enabled: prefs.enabled !== false,
          push:    prefs.enabled !== false && prefs.push !== false,
          sound:   prefs.enabled !== false && prefs.sound !== false,
        }
      : { enabled: true, push: true, sound: true };

    if (!result.enabled) return result;

    // Check DND
    const dndSnap = await db
      .ref(`branches/${branchId}/notification_preferences/${key}/_dnd`)
      .once('value');
    const dnd = dndSnap.val();

    if (dnd && dnd.enabled) {
      const isDND = dnd.manual === true || isDNDTimeActive(dnd.schedule);
      if (isDND) {
        return { enabled: true, push: false, sound: false };
      }
    }

    return result;
  } catch (e) {
    logger.warn(`Error reading prefs for ${userId}/${type}:`, e);
    return { enabled: true, push: true, sound: true };
  }
}

/**
 * Elimina un token FCM inválido de la base de datos.
 * Busca en la estructura del usuario y remueve la entrada que contiene el token.
 */
async function removeInvalidToken(branchId, userId, invalidToken) {
  try {
    const key = safePathKey(userId);
    const snap = await db
      .ref(`branches/${branchId}/fcm_tokens/${key}`)
      .once('value');
    const data = snap.val();
    if (!data) return;

    // Caso: token directo { token: 'abc123' }
    if (data.token === invalidToken) {
      await db.ref(`branches/${branchId}/fcm_tokens/${key}`).remove();
      logger.info(`Token inválido eliminado para usuario ${userId} (formato simple)`);
      return;
    }

    // Caso: múltiples dispositivos { deviceId: { token: '...' } }
    for (const [deviceId, entry] of Object.entries(data)) {
      if (entry && entry.token === invalidToken) {
        await db.ref(`branches/${branchId}/fcm_tokens/${key}/${deviceId}`).remove();
        logger.info(`Token inválido eliminado para usuario ${userId}, dispositivo ${deviceId}`);
        return;
      }
    }
  } catch (e) {
    logger.warn(`Error limpiando token inválido para ${userId}:`, e);
  }
}

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

// ── Tier recalculation ──────────────────────────────────────

const TIER_THRESHOLDS = [
  { tier: 'platinum', minSpent: 5000 },
  { tier: 'gold', minSpent: 2000 },
  { tier: 'silver', minSpent: 500 },
  { tier: 'bronze', minSpent: 0 },
];

function computeTier(totalSpent) {
  const spent = totalSpent || 0;
  for (const t of TIER_THRESHOLDS) {
    if (spent >= t.minSpent) return t.tier;
  }
  return 'bronze';
}

/**
 * Recalcula el tier del cliente después de cada orden.
 * Si hubo subida de tier, crea una notificación milestone.
 */
export const recalculateCustomerTier = onValueWritten(
  {
    ref: 'branches/{branchId}/orders/{orderId}',
    region: 'us-central1',
  },
  async (event) => {
    const { branchId, orderId } = event.params;

    // Solo en creación
    const before = event.data.before.val();
    const after = event.data.after.val();
    if (before || !after) return;

    const customerEmail = after.customerEmail;
    const orderTotal = after.financials?.total || after.orderTotal || 0;
    if (!customerEmail || orderTotal <= 0) return;

    try {
      // Buscar customer por email
      const customersSnap = await db.ref('customers').once('value');
      const allCustomers = customersSnap.val() || {};
      let customerId = null;
      let customer = null;

      for (const [id, c] of Object.entries(allCustomers)) {
        if (c.email && c.email.toLowerCase() === customerEmail.toLowerCase()) {
          customerId = id;
          customer = c;
          break;
        }
      }

      if (!customerId || !customer) return;

      const newTotalSpent = (customer.totalSpent || 0) + orderTotal;
      const newTier = computeTier(newTotalSpent);
      const oldTier = computeTier(customer.totalSpent || 0);

      // Actualizar totalSpent + tier en el registro
      const updates = {
        totalSpent: newTotalSpent,
        tier: newTier,
        tierChangedAt: newTier !== oldTier ? Date.now() : (customer.tierChangedAt || null),
      };

      await db.ref(`customers/${customerId}`).update(updates);

      // Si hubo subida de tier, crear notificación milestone
      if (newTier !== oldTier) {
        const tierLabels = { bronze: 'Bronce', silver: 'Plata', gold: 'Oro', platinum: 'Platino' };
        const milestoneRef = db.ref(`customers/${customerId}/milestones`).push();
        await milestoneRef.set({
          type: 'tier_upgrade',
          tier: newTier,
          tierLabel: tierLabels[newTier] || newTier,
          oldTier,
          oldTierLabel: tierLabels[oldTier] || oldTier,
          totalSpent: newTotalSpent,
          timestamp: Date.now(),
          orderId,
          branchId,
        });

        // También crear notificación push para el frontend
        const notifRef = db.ref(`branches/${branchId}/notifications`).push();
        await notifRef.set({
          type: 'customer_milestone',
          title: `🎉 ¡Subiste a ${tierLabels[newTier] || newTier}!`,
          body: `Felicitaciones, ya acumulaste S/ ${newTotalSpent.toFixed(2)} en pedidos. Disfrutá tus nuevos beneficios.`,
          customerId,
          customerEmail,
          tier: newTier,
          timestamp: Date.now(),
          read: false,
        });

        logger.info(
          `Tier UP: ${customerEmail} — ${oldTier} → ${newTier} ` +
          `(total: S/ ${newTotalSpent.toFixed(2)}), orden ${orderId}`
        );
      }
    } catch (error) {
      logger.error(`Error recalculando tier para orden ${orderId}:`, error);
    }
  }
);

// ── Referral bonus ──────────────────────────────────────────

const REFERRAL_BONUS_REFERREE = 50;  // pts para el nuevo cliente
const REFERRAL_BONUS_REFERRER = 100; // pts para quien invitó

/**
 * Otorga bonus de referido cuando un cliente nuevo hace su primer pedido.
 * Detecta referredBy, verifica que sea el primer pedido, y acredita puntos
 * tanto al referido como a quien lo invitó.
 */
export const awardReferralBonus = onValueWritten(
  {
    ref: 'branches/{branchId}/orders/{orderId}',
    region: 'us-central1',
  },
  async (event) => {
    const { orderId } = event.params;

    // Solo en creación
    const before = event.data.before.val();
    const after = event.data.after.val();
    if (before || !after) return;

    const customerEmail = after.customerEmail;
    if (!customerEmail) return;

    try {
      // Buscar customer por email
      const customersSnap = await db.ref('customers').once('value');
      const allCustomers = customersSnap.val() || {};
      let customerId = null;
      let customer = null;

      for (const [id, c] of Object.entries(allCustomers)) {
        if (c.email && c.email.toLowerCase() === customerEmail.toLowerCase()) {
          customerId = id;
          customer = c;
          break;
        }
      }

      if (!customerId || !customer) return;

      // Solo primer pedido
      const orderCountBefore = customer.orderCount || 0;
      if (orderCountBefore !== 0) return;

      const referredByCode = customer.referredBy;
      if (!referredByCode) return;

      // Buscar referente por código
      const refIndexSnap = await db.ref(`referralCodes/${referredByCode}`).once('value');
      const refIndex = refIndexSnap.val();
      const referrerId = refIndex?.uid;
      if (!referrerId) return;

      logger.info(
        `Referido detectado: ${customerEmail} (${customerId}) invitado por ${referredByCode} (${referrerId})`
      );

      // Bonus al referido (50 pts)
      const refereeNewPoints = (customer.points || 0) + REFERRAL_BONUS_REFERREE;
      await db.ref(`customers/${customerId}/points`).set(refereeNewPoints);
      await db.ref(`customers/${customerId}/lifetimePoints`).set((customer.lifetimePoints || 0) + REFERRAL_BONUS_REFERREE);

      // Bonus al referente (100 pts) + contador
      const referrerSnap = await db.ref(`customers/${referrerId}`).once('value');
      const referrer = referrerSnap.val();
      if (!referrer) return;

      const referrerNewPoints = (referrer.points || 0) + REFERRAL_BONUS_REFERRER;
      const newReferralsCount = (referrer.referralsCount || 0) + 1;
      const newReferralBonusEarned = (referrer.referralBonusEarned || 0) + REFERRAL_BONUS_REFERRER;

      await db.ref(`customers/${referrerId}`).update({
        points: referrerNewPoints,
        lifetimePoints: (referrer.lifetimePoints || 0) + REFERRAL_BONUS_REFERRER,
        referralsCount: newReferralsCount,
        referralBonusEarned: newReferralBonusEarned,
      });

      // Registrar referido en el historial del referente
      const referralRef = db.ref(`customers/${referrerId}/referralHistory`).push();
      await referralRef.set({
        referredCustomerId: customerId,
        referredEmail: customerEmail,
        orderId,
        bonusPoints: REFERRAL_BONUS_REFERRER,
        timestamp: Date.now(),
      });

      // Notificación al referente
      const notifRef = db.ref('branches/notifications').push();
      await notifRef.set({
        type: 'referral_bonus',
        title: '🎉 ¡Ganaste puntos por referido!',
        body: `Un amigo al que invitaste hizo su primer pedido. Ganaste ${REFERRAL_BONUS_REFERRER} pts extra.`,
        customerId: referrerId,
        customerEmail: customer.referrerEmail || '',
        timestamp: Date.now(),
        read: false,
      });

      logger.info(
        `Bonus de referido: ${customerEmail} (+${REFERRAL_BONUS_REFERREE} pts), ` +
        `referente ${referredByCode} (+${REFERRAL_BONUS_REFERRER} pts, total: ${newReferralsCount} referidos)`
      );
    } catch (error) {
      logger.error(`Error otorgando bonus de referido para orden ${orderId}:`, error);
    }
  }
);

// ── Scheduled Cleanup ────────────────────────────────────────

/**
 * Valida y descuenta puntos canjeados al crear una orden.
 * Sirve como safety net server-side — si el cliente no descontó puntos
 * correctamente, esta función lo hace y flaggea la orden.
 */
export const validatePointsRedemption = onValueWritten(
  {
    ref: 'branches/{branchId}/orders/{orderId}',
    region: 'us-central1',
  },
  async (event) => {
    const { orderId } = event.params;

    // Solo en creación, no en update
    const before = event.data.before.val();
    const after = event.data.after.val();
    if (before || !after) return;

    const pointsRedeemed = after.financials?.points_redeemed;
    if (!pointsRedeemed || pointsRedeemed <= 0) return;

    const customerEmail = after.customerEmail;
    if (!customerEmail) return;

    logger.info(
      `Validando canje de ${pointsRedeemed} puntos para orden ${orderId} (${customerEmail})`
    );

    try {
      // Buscar customer por email
      const customersSnap = await db.ref('customers').once('value');
      const allCustomers = customersSnap.val() || {};
      let customerId = null;
      let customer = null;

      for (const [id, c] of Object.entries(allCustomers)) {
        if (c.email && c.email.toLowerCase() === customerEmail.toLowerCase()) {
          customerId = id;
          customer = c;
          break;
        }
      }

      if (!customerId || !customer) {
        logger.error(
          `Customer no encontrado para email ${customerEmail} (orden ${orderId})`
        );
        await db
          .ref(`branches/${event.params.branchId}/orders/${orderId}/points_error`)
          .set('Cliente no encontrado');
        return;
      }

      const currentBalance = customer.points || 0;

      if (currentBalance < pointsRedeemed) {
        logger.error(
          `Saldo insuficiente: ${customerEmail} tiene ${currentBalance} pts, ` +
            `intentó canjear ${pointsRedeemed} pts (orden ${orderId})`
        );
        await db.ref(`branches/${event.params.branchId}/orders/${orderId}`).update({
          points_error: `Saldo insuficiente: ${currentBalance} pts disponibles, ${pointsRedeemed} solicitados`,
        });
        return;
      }

      // Descontar puntos server-side (atómico)
      const newBalance = currentBalance - pointsRedeemed;
      await db.ref(`customers/${customerId}/points`).set(newBalance);

      // Registrar el canje en el historial del customer
      const redemptionRef = db
        .ref(`customers/${customerId}/redemptions`)
        .push();
      await redemptionRef.set({
        orderId,
        pointsRedeemed,
        timestamp: Date.now(),
        method: 'cloud_function',
      });

      logger.info(
        `Canje exitoso: ${customerEmail} — ${pointsRedeemed} pts descontados ` +
          `(saldo: ${newBalance}), orden ${orderId}`
      );
    } catch (error) {
      logger.error(
        `Error validando canje de puntos para orden ${orderId}:`,
        error
      );
    }
  }
);

const NOTIF_RETENTION_DAYS = 30;
const MS_PER_DAY = 86400000;

/**
 * Limpia notificaciones más antiguas que NOTIF_RETENTION_DAYS (30 días).
 * Corre todos los días a las 4:00 AM (UTC), que son ~11pm Perú.
 */
export const cleanupOldNotifications = onSchedule(
  {
    schedule: '0 4 * * *',
    region: 'us-central1',
    timeZone: 'America/Lima',
  },
  async () => {
    logger.info(`🧹 Iniciando limpieza de notificaciones > ${NOTIF_RETENTION_DAYS} días...`);

    const cutoff = Date.now() - NOTIF_RETENTION_DAYS * MS_PER_DAY;
    let totalRemoved = 0;
    let branchesProcessed = 0;

    try {
      // Escanear todas las branches
      const branchesSnap = await db.ref('branches').once('value');
      const branches = branchesSnap.val() || {};

      for (const branchId of Object.keys(branches)) {
        const usersSnap = await db
          .ref(`branches/${branchId}/notifications`)
          .once('value');
        const users = usersSnap.val();

        if (!users) continue;

        for (const [userId, notifs] of Object.entries(users)) {
          const toRemove = [];

          for (const [notifId, notif] of Object.entries(notifs)) {
            const ts = notif._createdAt_client || notif.createdAt;
            if (ts && ts < cutoff) {
              toRemove.push(notifId);
            }
          }

          if (toRemove.length > 0) {
            const updates = {};
            for (const id of toRemove) {
              updates[`branches/${branchId}/notifications/${userId}/${id}`] = null;
            }
            await db.ref().update(updates);
            totalRemoved += toRemove.length;
            logger.debug(
              `Branch ${branchId}, user ${userId}: ${toRemove.length} notificación(es) eliminada(s)`
            );
          }
        }
        branchesProcessed++;
      }

      logger.info(
        `🧹 Limpieza completada: ${totalRemoved} notificación(es) eliminada(s) ` +
          `de ${branchesProcessed} sucursal(es)`
      );
    } catch (error) {
      logger.error('Error durante limpieza de notificaciones:', error);
    }
  }
);

// ── Customer promotion push ─────────────────────────────────

/**
 * Envía push notification a todos los clientes con FCM token
 * cuando se crea una promoción activa.
 */
export const sendCustomerPromotionPush = onValueWritten(
  {
    ref: 'promotions/{promoId}',
    region: 'us-central1',
  },
  async (event) => {
    const { promoId } = event.params;

    // Solo en creación
    const before = event.data.before.val();
    const after = event.data.after.val();
    if (before || !after) return;

    if (!after.active) {
      logger.debug(`Promoción ${promoId} inactiva, skip push.`);
      return;
    }

    const { title, description, targetSegment, type, value } = after;
    if (!title) {
      logger.warn(`Promoción ${promoId} sin título, skip push.`);
      return;
    }

    logger.info(
      `Promoción creada: "${title}" (${targetSegment || 'all'}), enviando push...`
    );

    try {
      // Leer todos los customers
      const customersSnap = await db.ref('customers').once('value');
      const allCustomers = customersSnap.val() || {};

      const valueLabel = type === 'bonus_points'
        ? `+${value} pts`
        : type === 'discount_percent'
          ? `${value}% OFF`
          : '';

      const message = {
        notification: {
          title: `🎉 ${title}`,
          body: description || valueLabel,
        },
        data: {
          type: 'promotion',
          promoId,
          targetSegment: targetSegment || 'all',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        webpush: {
          fcmOptions: {
            link: '/menu-app/',
          },
          notification: {
            icon: '/menu-app/logo.jpg',
            badge: '/menu-app/favicon.svg',
          },
        },
      };

      let sentCount = 0;
      const tokensByCustomer = {};

      for (const [uid, customer] of Object.entries(allCustomers)) {
        // Filtrar por segmento
        if (targetSegment && targetSegment !== 'all') {
          if (targetSegment.startsWith('tier:')) {
            const requiredTier = targetSegment.replace('tier:', '');
            const customerTier = customer.tier || 'bronze';
            if (customerTier !== requiredTier) continue;
          } else if (targetSegment === 'new_customers') {
            const orderCount = customer.orderCount || 0;
            if (orderCount > 0) continue;
          }
        }

        // Recoger tokens FCM
        if (customer.fcmTokens) {
          for (const [deviceId, tokenData] of Object.entries(customer.fcmTokens)) {
            if (tokenData && tokenData.token) {
              tokensByCustomer[uid] = tokensByCustomer[uid] || [];
              tokensByCustomer[uid].push(tokenData.token);
            }
          }
        }
      }

      // Enviar push por lote (hasta 500 por mensaje)
      const allTokens = Object.values(tokensByCustomer).flat();
      if (allTokens.length === 0) {
        logger.info(`Sin clientes con FCM para promoción ${promoId}, skip push.`);
        return;
      }

      // Enviar en lotes de 500
      const BATCH_SIZE = 500;
      for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
        const batch = allTokens.slice(i, i + BATCH_SIZE);
        const messagesWithKeys = batch.map((token) => ({ ...message, token }));
        const response = await admin.messaging().sendEach(messagesWithKeys);
        sentCount += response.responses.filter((r) => r.success).length;
      }

      logger.info(
        `Push de promoción "${title}" enviado a ${sentCount}/${allTokens.length} dispositivo(s)`
      );
    } catch (error) {
      logger.error(`Error enviando push de promoción ${promoId}:`, error);
    }
  }
);

// ── Birthday bonus ──────────────────────────────────────────

const BIRTHDAY_BONUS = 100;

/**
 * Se ejecuta diariamente a las 6 AM. Busca clientes que cumplan años hoy
 * y les acredita 100 pts si no lo recibieron ya este año.
 */
export const awardBirthdayBonus = onSchedule(
  {
    schedule: '0 6 * * *',
    region: 'us-central1',
    timeZone: 'America/Lima',
  },
  async () => {
    logger.info('🎂 Revisando cumpleaños del día...');

    try {
      const now = new Date();
      const todayMMDD = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const thisYear = now.getFullYear();

      const customersSnap = await db.ref('customers').once('value');
      const allCustomers = customersSnap.val() || {};

      let awarded = 0;
      for (const [uid, customer] of Object.entries(allCustomers)) {
        const birthDate = customer.birthDate;
        if (!birthDate) continue;

        // birthDate stored as MM-DD
        if (birthDate !== todayMMDD) continue;

        // Ya lo recibió este año?
        if (customer.lastBirthdayBonusAwarded === thisYear) continue;

        // Acreditar bonus
        const newPoints = (customer.points || 0) + BIRTHDAY_BONUS;
        await db.ref(`customers/${uid}`).update({
          points: newPoints,
          lifetimePoints: (customer.lifetimePoints || 0) + BIRTHDAY_BONUS,
          lastBirthdayBonusAwarded: thisYear,
        });

        // Milestone
        await set(db.ref(`customers/${uid}/milestones/birthday_${thisYear}`), {
          type: 'birthday_bonus',
          points: BIRTHDAY_BONUS,
          year: thisYear,
          timestamp: Date.now(),
        });

        awarded++;
        logger.info(
          `🎂 Bonus cumpleaños: ${customer.email || uid} — +${BIRTHDAY_BONUS} pts`
        );
      }

      logger.info(
        `🎂 Birthday bonus completado: ${awarded} cliente(s) premiado(s)`
      );
    } catch (error) {
      logger.error('Error en awardBirthdayBonus:', error);
    }
  }
);

/**
 * Se ejecuta cada hora. Revisa rachas de pedidos:
 * 3+ pedidos en una ventana de 7 días → bonus de racha.
 */
export const awardStreakBonus = onSchedule(
  {
    schedule: '0 * * * *',
    region: 'us-central1',
    timeZone: 'America/Lima',
  },
  async () => {
    logger.info('🔥 Revisando rachas de pedidos...');

    try {
      const now = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const STREAK_BONUS = 50;
      const MIN_ORDERS = 3;

      const customersSnap = await db.ref('customers').once('value');
      const allCustomers = customersSnap.val() || {};

      let awarded = 0;
      for (const [uid, customer] of Object.entries(allCustomers)) {
        const orderCount = customer.orderCount || 0;
        if (orderCount < MIN_ORDERS) continue;

        // Ya recibió bonus de racha en los últimos 7 días?
        const lastStreakDate = customer.lastStreakBonusAwarded || 0;
        if (lastStreakDate > now - SEVEN_DAYS_MS) continue;

        // Buscar pedidos recientes del customer en TODAS las sucursales
        const branchesSnap = await db.ref('branches').once('value');
        const branches = branchesSnap.val() || {};
        const recentOrders = [];

        for (const [branchId, branchData] of Object.entries(branches)) {
          const ordersData = branchData.orders;
          if (!ordersData) continue;
          for (const [orderId, order] of Object.entries(ordersData)) {
            if (
              order.customerEmail &&
              order.customerEmail.toLowerCase() === (customer.email || '').toLowerCase()
            ) {
              recentOrders.push({
                id: orderId,
                branchId,
                createdAt: order.createdAt || order.timestamp || 0,
              });
            }
          }
        }

        // Ordenar por fecha descendente
        recentOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (recentOrders.length < MIN_ORDERS) continue;

        // Ver si los últimos N pedidos están dentro de 7 días
        const latestOrderTime = new Date(recentOrders[0].createdAt).getTime();
        const oldestInWindow = latestOrderTime - SEVEN_DAYS_MS;
        const ordersInWindow = recentOrders.filter(
          (o) => new Date(o.createdAt).getTime() >= oldestInWindow
        );

        if (ordersInWindow.length < MIN_ORDERS) continue;

        // Award streak bonus
        const newPoints = (customer.points || 0) + STREAK_BONUS;
        const currentStreak = customer.currentStreak || 0;
        const newStreak = currentStreak + 1;

        await db.ref(`customers/${uid}`).update({
          points: newPoints,
          lifetimePoints: (customer.lifetimePoints || 0) + STREAK_BONUS,
          currentStreak: newStreak,
          bestStreak: Math.max(customer.bestStreak || 0, newStreak),
          lastStreakBonusAwarded: now,
        });

        // Milestone
        const streakMilestoneRef = db.ref(`customers/${uid}/milestones`).push();
        await streakMilestoneRef.set({
          type: 'streak_bonus',
          streak: newStreak,
          points: STREAK_BONUS,
          ordersInWindow: ordersInWindow.length,
          timestamp: now,
        });

        awarded++;
        logger.info(
          `🔥 Streak: ${customer.email || uid} — racha ${newStreak}, +${STREAK_BONUS} pts`
        );
      }

      logger.info(
        `🔥 Streak bonus completado: ${awarded} cliente(s) premiado(s)`
      );
    } catch (error) {
      logger.error('Error en awardStreakBonus:', error);
    }
  }
);
