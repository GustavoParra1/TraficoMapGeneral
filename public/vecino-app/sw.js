// Service worker: instalable (PWA) + notificaciones push en segundo plano
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // sin caché, solo para ser instalable

// Config de Firebase hardcodeada (son valores públicos del lado cliente, no secretos).
// IMPORTANTE: se inicializa de forma SÍNCRONA (sin fetch/await) para que el listener
// de push quede registrado apenas arranca el Service Worker. Si esto fuera async,
// una notificación que llega mientras el SW recién está "despertando" (app cerrada,
// pantalla bloqueada) se pierde sin mostrarse, porque el fetch a config.json no
// llega a resolver a tiempo.
firebase.initializeApp({
  projectId: 'trafico-map-general-v2',
  apiKey: 'AIzaSyCkYYx5n-gKaKtTqOv2R1Glz1D_TA_Y5KA',
  authDomain: 'trafico-map-general-v2.firebaseapp.com',
  storageBucket: 'trafico-map-general-v2.firebasestorage.app',
  messagingSenderId: '540631719751',
  appId: '1:540631719751:web:bd410f1bbee18e9fabb662'
});

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler((payload) => {
  console.log('[sw.js] Notificación en background recibida:', payload);
  const title = (payload.notification && payload.notification.title) || '🚨 Alerta de emergencia';
  const body = (payload.notification && payload.notification.body) || 'Hay una alerta activa cerca tuyo';
  return self.registration.showNotification(title, {
    body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: payload.data || {}
  });
});

// Al tocar la notificación, ir directo a la alerta correspondiente
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const denunciaId = (event.notification.data && event.notification.data.denunciaId) || null;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      // Si ya hay una ventana de la app abierta, la enfocamos y le avisamos
      // por mensaje a qué alerta ir (no podemos simplemente cambiarle la URL).
      for (const client of clientsArr) {
        if (client.url.includes('vecino-app')) {
          client.postMessage({ tipo: 'ir_a_alerta', denunciaId });
          return client.focus();
        }
      }
      // Si no hay ninguna ventana abierta, abrimos una nueva con el ID en la URL
      const url = denunciaId ? `./index.html?panico=${denunciaId}` : './index.html';
      return self.clients.openWindow(url);
    })
  );
});
