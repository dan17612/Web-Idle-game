// Minimaler Service Worker: App-Shell cachen, für Supabase immer Netz.
const VERSION = 'zoo-empire-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Supabase & externe APIs: immer Netz, nie cachen
  if (url.origin !== self.location.origin) return

  // Navigations-Requests: Network-first, Fallback auf Cache/index
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    )
    return
  }

  // Statische Assets: Cache-first mit Background-Refresh
  e.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(resp => {
        if (resp && resp.ok) {
          const copy = resp.clone()
          caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {})
        }
        return resp
      }).catch(() => cached)
      return cached || fetchPromise
    })
  )
})
