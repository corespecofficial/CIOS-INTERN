// CIOS service worker — v3
// - Install: pre-cache app shell
// - Fetch: cache-first for static, network-first for API, stale-while-revalidate for media
// - Push notifications handler (existing)
// - Offline fallback page for navigations
// - Skip-waiting + message channel for "Update available" UI

const VERSION = "cios-sw-v3.2.0";
const IS_DEV = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const IMAGE_CACHE = `${VERSION}-images`;

// Minimum shell to work offline
const APP_SHELL = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Best-effort: if any shell URL fails, don't block install
      await Promise.allSettled(APP_SHELL.map((u) => cache.add(u)));
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old versioned caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("cios-sw-") && !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isNavigation(req) {
  return req.mode === "navigate" || (req.method === "GET" && req.headers.get("accept")?.includes("text/html"));
}

const CACHED_IMAGE_ORIGINS = [
  "https://res.cloudinary.com",
  "https://emojicdn.elk.sh",
  "https://em-content.zobj.net",
  "https://img.clerk.com",
];

function isImageLike(url) {
  return CACHED_IMAGE_ORIGINS.includes(url.origin) ||
    /\.(png|jpg|jpeg|webp|gif|svg|avif)$/i.test(url.pathname);
}

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") ||
    /\.(css|js|woff2?|ttf|eot)$/i.test(url.pathname);
}

function isApi(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Skip cross-origin except whitelisted image CDNs
  if (url.origin !== self.location.origin && !CACHED_IMAGE_ORIGINS.includes(url.origin)) return;

  // Don't cache Ably, Clerk, Supabase
  if (url.hostname.includes("ably") || url.hostname.includes("clerk") || url.hostname.includes("supabase")) return;

  // In dev, bypass SW entirely — hot-reloads + hydration don't tolerate cached HTML/JS
  if (IS_DEV) return;

  // Navigation → network-first with offline fallback
  if (isNavigation(req)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          // Cache successful HTML responses for fallback
          if (fresh.ok && url.origin === self.location.origin) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(req, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch {
          const cache = await caches.open(RUNTIME_CACHE);
          const cached = await cache.match(req);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          if (offline) return offline;
          return new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } });
        }
      })()
    );
    return;
  }

  // Images → stale-while-revalidate
  if (isImageLike(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cached = await cache.match(req);
        const networkPromise = fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone()).catch(() => {});
          return res;
        }).catch(() => null);
        return cached || (await networkPromise) || new Response("", { status: 504 });
      })()
    );
    return;
  }

  // Static assets → cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      })()
    );
    return;
  }

  // API → network-first, fall back to cache
  if (isApi(url)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(req, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch {
          const cache = await caches.open(RUNTIME_CACHE);
          const cached = await cache.match(req);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: "offline" }), { status: 503, headers: { "content-type": "application/json" } });
        }
      })()
    );
    return;
  }
});

/* ── Push notifications ── */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "CIOS", body: event.data?.text?.() || "" }; }
  const title = data.title || "CIOS";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: "/badge-72.png",
    data: { url: data.url || "/notifications" },
    tag: data.tag || "cios-notification",
    renotify: true,
    vibrate: data.vibrate || [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          if ("navigate" in client) { try { client.navigate(url); } catch {} }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

/* ── Local alarm fallback via postMessage ── */
// (Client-side alarm-engine keeps running when the tab is open.
//  Real background alarms when the tab is closed require a Periodic Background Sync — not widely supported;
//  Push notifications triggered from server are the reliable path.)
self.addEventListener("sync", (event) => {
  if (event.tag === "cios-sync-drafts") {
    event.waitUntil(syncDrafts());
  }
});

async function syncDrafts() {
  // Stub — Background Sync flow would post queued drafts here.
  // Clients can send drafts via fetch queue after reconnect; the retry is handled client-side for now.
  return;
}
