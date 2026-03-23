/* eslint-disable no-restricted-globals */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title || 'AlphaDesk', {
      body: data.body || '새로운 브리핑이 도착했습니다.',
      icon: '/favicon.ico',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(url));
        if (existing) {
          return existing.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
