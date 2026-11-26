/* 梦境手记：只缓存界面与公开语料，不处理 DeepSeek 请求，不读取 localStorage。 */
const CACHE = 'dream-journal-v20261126h';
const CORE = [
  './',
  './index.html',
  './styles.css?v=20261126h',
  './app.js?v=20261126h',
  './folk-corpus.json?v=20261126h',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('dream-journal-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* 页面采用网络优先：在线时尽快看到新版，断网时回退到已缓存的应用外壳。 */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html').then(cached => cached || caches.match('./')))
    );
    return;
  }

  /* 静态资源先读缓存，同时在后台更新；带新版本号的资源会重新下载。 */
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached || Response.error());
      return cached || network;
    })
  );
});
