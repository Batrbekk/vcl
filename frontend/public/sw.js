self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'VOXI';
  const options = {
    body: data.body || '',
    icon: '/logo-icon.svg',
    badge: '/logo-icon.svg',
    data: { url: data.url || '/' },
    tag: data.tag || 'voxi-notification',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
