importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBnl7hSfXXUj4khyV3yrhT5oUtMQfdoH_A",
    authDomain: "newbi-ent-v2.firebaseapp.com",
    projectId: "newbi-ent-v2",
    storageBucket: "newbi-ent-v2.firebasestorage.app",
    messagingSenderId: "860370467784",
    appId: "1:860370467784:web:d7b4dfc66336f6da50defd"
});

// Push isn't available everywhere this worker runs (iPhone Safari outside the
// Home Screen app), so a missing Messaging must not stop the worker installing.
try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/logo_full.png',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.warn('[firebase-messaging-sw.js] Push is not available here:', e && e.message);
}

/*
 * Passes offline. A pass page (/p/REF, /t/TOKEN) that has loaded once asks
 * this worker to keep a copy of itself and the scripts it used. Requests
 * always go to the network first; the saved copy is only used when the phone
 * has no signal, e.g. at the gate.
 */
const PASS_CACHE = 'nb-passes-v1';

// Take over straight away, so a phone that already had the push-only worker gets offline passes too.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'nb-cache-pages' || !Array.isArray(data.urls)) return;
  const urls = data.urls.filter((u) => typeof u === 'string' && u.startsWith(self.location.origin)).slice(0, 80);
  event.waitUntil(caches.open(PASS_CACHE).then((cache) => Promise.all(urls.map((u) => cache.add(new Request(u, { credentials: 'same-origin' })).catch(() => null)))));
});

const isPassPage = (url) => /^\/(app\/)?(p|t)\//.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const navigation = req.mode === 'navigate';
  if (!(navigation ? isPassPage(url) : /^\/(assets|brand)\//.test(url.pathname))) return;
  event.respondWith(
    fetch(req).catch(() => caches.open(PASS_CACHE)
      .then((cache) => cache.match(req, { ignoreSearch: navigation }))
      .then((hit) => hit || Response.error()))
  );
});
