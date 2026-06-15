// Firebase Cloud Messaging Service Worker
// Maneja notificaciones push en background (app minimizada / pantalla bloqueada)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Inicializar con config del proyecto (safe para SW â€” es config pÃºblica)
firebase.initializeApp({
  apiKey: '__FIREBASE_API_KEY__',
  authDomain: 'house-menuapp.firebaseapp.com',
  databaseURL: 'https://house-menuapp-default-rtdb.firebaseio.com',
  projectId: 'house-menuapp',
  storageBucket: 'house-menuapp.firebasestorage.app',
  messagingSenderId: '740954318746',
  appId: '1:740954318746:web:7d143c34a0714f8fed7c23',
});

const messaging = firebase.messaging();

// Manejar mensajes en background
messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || 'Â¡Nuevo Pedido!';
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
      { action: 'view',    title: 'ðŸ‘€ Ver KDS' },
      { action: 'dismiss', title: 'Ignorar'    },
    ],
  });
});

// Click en la notificaciÃ³n â†’ abrir/enfocar KDS
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/staff/cocina';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/staff/cocina') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
