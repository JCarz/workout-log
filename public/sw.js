const CACHE_NAME = 'workout-log-v2'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(APP_SHELL)

  const indexResponse = await fetch('/index.html', { cache: 'no-store' })
  const indexHtml = await indexResponse.text()
  const builtAssets = [...indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)]
    .map((match) => match[1])

  await cache.addAll(builtAssets)
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_URLS' || !Array.isArray(event.data.urls)) return

  const sameOriginUrls = event.data.urls.filter((url) => {
    try {
      return new URL(url).origin === self.location.origin
    } catch {
      return false
    }
  })

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(sameOriginUrls)),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          const copy = response.clone()
          const cache = await caches.open(CACHE_NAME)
          await cache.put('/index.html', copy)
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse

      return fetch(request).then(async (response) => {
        if (response.ok) {
          const copy = response.clone()
          const cache = await caches.open(CACHE_NAME)
          await cache.put(request, copy)
        }

        return response
      })
    }),
  )
})
