import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

const DEBUG = true

const baseURI = new URL(self.location.href).searchParams.get('baseURI')!
if (!baseURI) throw new Error('[SW] Missing required baseURI param')
if (DEBUG) console.log('[SW] baseURI=', baseURI)

//@ts-ignore
self.__WB_DISABLE_DEV_LOGS = true

self.addEventListener('install', (event) => {
  //@ts-ignore
  event.waitUntil((async () => {
    //@ts-ignore
    await self.skipWaiting()
    const cache = await caches.open('html-shell')
    try { await cache.add(baseURI) } catch (e) { if (DEBUG) console.log('[SW] seed failed', e) }
  })())
})

self.addEventListener('activate', (event) => {
  if (DEBUG) console.log('[SW] Activate event')
  //@ts-ignore
  event.waitUntil(self.clients.claim())
})

registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin && (
      request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'font' ||
      request.destination === 'manifest' ||
      request.destination === 'image'
    ),
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
)


const isAuthPath = (pathname: string) => {
  if (!pathname.startsWith(baseURI)) return false
  const rel = pathname.slice(baseURI.length)
  return rel === 'auth' || rel.startsWith('auth/')
}

registerRoute(
  ({ request, url }) => request.mode === 'navigate' && !isAuthPath(url.pathname),
  async ({ event }) => {
    const cache = await caches.open('html-shell')
    try {
      const res = await fetch(event.request)
      if (res.ok) cache.put(baseURI, res.clone()).catch(() => {})
      return res
    } catch {
      return (await cache.match(baseURI)) || new Response('Offline', { status: 503 })
    }
  }
)
