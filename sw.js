const CACHE = 'tierra-cevil-v20';
const SHELL = ['./', './index.html', './app.css', './viaje.js', './core.js', './controles.js', './ayuda.js', './balanza.js', './informes.js', './clima.js', './acopios.js', './revision.js', './plano-playa.js', './img/playa-plano.jpg', './vistas.js', './carga.js', './viajes.js', './app.js', './config.js', './manifest.json', './img/logo-cmp.png', './img/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const externo = /cdnjs\.cloudflare\.com$|fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !externo) return;
  const propio = url.origin === location.origin;
  e.respondWith(
    fetch(propio ? new Request(req, { cache: 'no-cache' }) : req).then(r => {
      if (r.ok) {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
      }
      return r;
    }).catch(() => caches.match(req))
  );
});
