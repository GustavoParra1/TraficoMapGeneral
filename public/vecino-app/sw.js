// Service worker: instalable (PWA) + notificaciones push en segundo plano
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // sin caché, solo para ser instalable

// Inicializar Firebase Messaging con la misma config que usa la app
(async () => {
  try {
    const response = await fetch('../config.json');
    const config = await response.json();
    firebase.initializeApp(config.firebase);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = (payload.notification && payload.notification.title) || '🚨 Alerta de emergencia';
      const body = (payload.notification && payload.notification.body) || 'Hay una alerta activa cerca tuyo';
      self.registration.showNotification(title, {
        body,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        data: payload.data || {}
      });
    });
  } catch (e) {
    console.error('SW: error inicializando Firebase Messaging', e);
  }
})();

// Al tocar la notificación, enfocar o abrir la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      if (clientsArr.length > 0) return clientsArr[0].focus();
      return self.clients.openWindow('./index.html');
    })
  );
});
