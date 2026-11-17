/*
  The Clinical Room · service worker, for flashcard reminders only.
  It shows the push notifications the send-reminders function sends, and opens the flashcards
  page when one is tapped. It caches nothing, so the site always loads fresh.
*/

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'The Clinical Room';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Your flashcards are waiting.',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.tag || 'flashcards',
      renotify: false,
      data: { url: data.url || '/flashcards' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/flashcards', self.location.origin);
  // only ever open a page of this site
  const url = target.origin === self.location.origin ? target.href : new URL('/flashcards', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of open) {
        if (new URL(c.url).origin === self.location.origin && 'focus' in c) {
          await c.focus();
          if ('navigate' in c) await c.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
