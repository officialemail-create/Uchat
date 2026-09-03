self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'Uchat', {
    body: data.body || 'New message',
    icon: `${self.registration.scope}logo.ico`,
    data: { url: data.url || self.registration.scope },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || self.registration.scope, self.registration.scope).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    const existing = windowClients.find((client) => client.url.startsWith(self.registration.scope));
    if (existing && 'focus' in existing) return existing.focus().then(() => existing.navigate(targetUrl));
    return clients.openWindow(targetUrl);
  }));
});