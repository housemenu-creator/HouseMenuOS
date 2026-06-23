// Firebase Cloud Messaging Service Worker
// Maneja notificaciones push en background (app minimizada / pantalla bloqueada)
//
// Firebase config is injected at build time by scripts/inject-sw-config.mjs
// from VITE_FIREBASE_* environment variables.
importScripts('./_firebaseConfig.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const config = self.__FIREBASE_CONFIG__;
if (!config) {
  console.warn('[SW] No Firebase config found — push notifications disabled');
} else {
  firebase.initializeApp(config);

  const messaging = firebase.messaging();

  // Manejar mensajes en background
  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const data = payload.data || {};

    const title = notification.title || data.title || '¡Nuevo Pedido!';
    const body  = notification.body  || data.body  || 'Hay un nuevo pedido en cocina';

    self.registration.showNotification(title, {
      body,
      icon: notification.icon || '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      tag: data.orderId || 'kds-notification',
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || '/staff/cocina' },
      actions: [
        { action: 'view',    title: '👀 Ver' },
        { action: 'dismiss', title: 'Ignorar'  },
      ],
    });
  });

  // Click en la notificación → abrir/enfocar la URL correspondiente
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const url = event.notification.data?.url || '/staff/despacho';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        const appClient = clientList.find((c) => c.url.includes('/staff/') || c.url.includes('/admin') || c.url.includes('/carta'));
        if (appClient && 'focus' in appClient) {
          if ('navigate' in appClient) {
            appClient.navigate(url);
          }
          return appClient.focus();
        }
        return clients.openWindow(url);
      })
    );
  });
}
