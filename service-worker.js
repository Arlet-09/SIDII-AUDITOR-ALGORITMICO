/*
 * UT-GEST - Service Worker y Cache API.
 * El alcance se calcula desde la ubicación real del Service Worker; funciona tanto
 * en la raíz del dominio como en subdirectorios (por ejemplo, GitHub Pages).
 */
const CACHE_PREFIX = 'ut-gest-';
const CACHE_NAME = 'ut-gest-shell-v5';
const APP_SCOPE_URL = new URL(self.registration.scope);
const APP_URL = (path) => new URL(path, APP_SCOPE_URL).href;
const INDEX_URL = APP_URL('index.html');
const APP_SHELL = [
  APP_URL('index.html'),
  APP_URL('styles.css'),
  APP_URL('script.js'),
  APP_URL('pwa.js'),
  APP_URL('manifest.json'),
  APP_URL('icons/icon-192.png'),
  APP_URL('icons/icon-512.png')
];
const APP_SHELL_URLS = new Set(APP_SHELL);
const ALLOWED_EXTERNAL_CACHE_HOSTS = new Set([
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
]);

// INSTALL: abre la caché versionada y precarga los archivos estáticos de la PWA.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

// ACTIVATE: elimina versiones anteriores que pertenezcan a UT-GEST, sin tocar otras apps.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

// Navegación: NETWORK-FIRST. Si no hay conexión, devuelve el index.html guardado.
async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      await cache.put(INDEX_URL, response.clone());
    }
    return response;
  } catch (error) {
    const fallback = await cache.match(INDEX_URL);
    if (fallback) return fallback;
    throw error;
  }
}

// Recursos estáticos: CACHE-FIRST. Si falta la copia guardada, descarga y almacena una.
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    await cache.put(request, response.clone());
  }
  return response;
}

function isWithinAppScope(url) {
  return url.origin === APP_SCOPE_URL.origin && url.pathname.startsWith(APP_SCOPE_URL.pathname);
}

// FETCH: solo intercepta GET; no guarda envíos de formularios ni solicitudes POST.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isLocalAppRequest = isWithinAppScope(url);

  if (isLocalAppRequest && request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isLocalAppRequest && APP_SHELL_URLS.has(url.href)) {
    event.respondWith(cacheFirst(request).catch(async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;
      return new Response('Recurso no disponible sin conexión.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }));
    return;
  }

  // Los recursos externos se cachean solo si provienen de hosts conocidos usados por la interfaz.
  // Esta comprobación queda fuera de isLocalAppRequest porque Chart.js y las fuentes son externos.
  if (ALLOWED_EXTERNAL_CACHE_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirst(request).catch(async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;
      return new Response('Recurso externo no disponible sin conexión.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }));
  }
});
