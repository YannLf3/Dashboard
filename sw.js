/* ---------------------------------------------------------
   Service worker : rend l'app ouvrable hors ligne.
   Stratégie « réseau d'abord » : on essaie toujours de charger
   la dernière version ; si le réseau échoue, on sert la copie
   en cache. Les appels à Supabase ne sont jamais mis en cache.
   Change VERSION à chaque mise en ligne importante.
   --------------------------------------------------------- */
const VERSION = 'cockpit-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname.endsWith('supabase.co') || url.hostname.includes('api.gouv.fr')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && (url.origin === location.origin || url.hostname.includes('jsdelivr') || url.hostname.includes('fonts.g'))) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
  );
});
