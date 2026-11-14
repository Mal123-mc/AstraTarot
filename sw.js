'use strict';

/*
 * 星屿塔罗 · Service Worker
 * 策略：网络优先，成功即更新缓存；离线时回退到上一次访问过的版本。
 */

const CACHE_NAME = 'astra-tarot-v3';
const PRECACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/cards.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key !== CACHE_NAME) return caches.delete(key);
          return null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function offlineResponse() {
  return new Response('离线状态下这张牌还没有被缓存。', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy).catch(function () { /* quota / opaque responses */ });
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(request).then(function (cached) {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('./index.html').then(function (page) { return page || offlineResponse(); });
          }
          return offlineResponse();
        });
      })
  );
});
