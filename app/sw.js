// LittleNest Service Worker — enables PWA install and background notification support
const CACHE = 'littlenest-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Handle push events (for future FCM integration)
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'LittleNest 🪺', {
      body: data.body || 'You have a new update.',
      icon: 'https://img.icons8.com/fluency/512/nest.png',
      badge: 'https://img.icons8.com/fluency/512/nest.png',
      tag: data.tag || 'littlenest',
      renotify: true,
      data: { url: data.url || '/' }
    })
  );
});

// Tap notification → open app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
