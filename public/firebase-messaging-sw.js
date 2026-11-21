importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

(function initTruckGestaoMessagingSW() {
  try {
    const swUrl = new URL(self.location.href);
    const apiKey = swUrl.searchParams.get('apiKey');
    const authDomain = swUrl.searchParams.get('authDomain');
    const projectId = swUrl.searchParams.get('projectId');
    const storageBucket = swUrl.searchParams.get('storageBucket');
    const messagingSenderId = swUrl.searchParams.get('messagingSenderId');
    const appId = swUrl.searchParams.get('appId');

    if (apiKey && projectId && messagingSenderId && appId && typeof firebase !== 'undefined') {
      if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp({
          apiKey,
          authDomain: authDomain || undefined,
          projectId,
          storageBucket: storageBucket || undefined,
          messagingSenderId,
          appId,
        });
      }

      const messaging = firebase.messaging();
      messaging.onBackgroundMessage(function (payload) {
        const notification = payload && payload.notification ? payload.notification : {};
        const data = payload && payload.data ? payload.data : {};
        const title = notification.title || data.title || 'TruckGestão PRO';
        const body =
          notification.body ||
          data.body ||
          'Nova atualização operacional disponível no Portal do Motorista.';
        const tag = data.tag || 'truckgestao-' + (data.category || 'alert');

        return self.registration.showNotification(title, {
          body,
          tag,
          renotify: true,
          requireInteraction: data.priority === 'urgent' || data.category === 'maintenance',
          data: {
            url: data.url || '/',
            category: data.category || 'general',
          },
        });
      });
    }
  } catch (err) {
    console.warn('[TruckGestão SW] Falha ao inicializar FCM background:', err);
  }

  self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const targetUrl =
      (event.notification && event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (clientList) {
          for (let i = 0; i < clientList.length; i += 1) {
            const client = clientList[i];
            if ('focus' in client) {
              return client.focus();
            }
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow(targetUrl);
          }
          return undefined;
        })
    );
  });
})();
