const CACHE_NAME = "minhas-financas-v1.0.0.32";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/supabase-config.js",
  "/manifest.webmanifest",
  "/icon-192.svg",
  "/icon-512.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match("/").then(hit => hit || caches.match("/index.html"))))
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() || "Você tem uma nova atualização financeira." };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Meu Bolso", {
      body: data.body || "Você tem uma nova atualização financeira.",
      icon: "/icon-192.svg",
      badge: "/icon-192.svg",
      tag: data.tag || "meu-bolso-notification",
      data: { url: data.url || "/" }
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
