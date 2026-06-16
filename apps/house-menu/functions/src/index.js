/**
 * House Menu — Firebase Cloud Functions
 *
 * FCM Sender:
 *   Escucha escrituras en branches/{branchId}/notifications/{userId}/{notifId}
 *   y envía push notifications via Firebase Admin SDK a los tokens FCM
 *   registrados en branches/{branchId}/fcm_tokens/{userId}.
 *
 * Requiere:
 *   - Firebase project en plan Blaze (Cloud Functions)
 *   - Service account con permisos de Cloud Messaging
 *   - firebase-tools para deploy: firebase deploy --only functions
 */
import { onValueWritten } from 'firebase-functions/v2/database';
import { logger } from 'firebase-functions';
import admin from 'firebase-admin';

admin.initializeApp();

const db = admin.database();

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
