// GarmentFlow ERP — Service Worker
// Handles: Firebase push notifications + PWA app-shell caching

const CACHE = "garmentflow-v1";
const APP_SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for API, cache-first for app shell assets
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.pathname.startsWith("/graphql")) return; // never cache API
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && (APP_SHELL.includes(url.pathname) || url.pathname.startsWith("/_next/static"))) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request).then(cached => cached || new Response("Offline", { status: 503 })))
  );
});

// ── Firebase Cloud Messaging ──────────────────────────────────────────────────

importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js");

// Config is injected at runtime via query-string or postMessage.
// For now we read it from the SW's own location search string, which
// the FcmManager sets when registering: ?apiKey=...&projectId=...
const params = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: params.get("apiKey") || "",
  projectId: params.get("projectId") || "",
  messagingSenderId: params.get("messagingSenderId") || "",
  appId: params.get("appId") || "",
};

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Background push: show notification from service worker
  messaging.onBackgroundMessage(payload => {
    const data = payload.data || {};
    const title = data.title || "GarmentFlow";
    const body = data.body || "";
    const link = data.link || "/";
    self.registration.showNotification(title, {
      body,
      icon: "/logo.png",
      badge: "/logo.png",
      data: { link },
    });
  });
}

// Open or focus the app window when a notification is clicked
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const link = (event.notification.data || {}).link || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(link);
      } else {
        clients.openWindow(link);
      }
    })
  );
});
