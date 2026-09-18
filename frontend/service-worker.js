"use strict";
const CACHE = "f4f-shell-v1";
const SHELL = ["/offline.html", "/css/dashboard.css", "/css/training.css", "/css/athlete-production.css", "/assets/f4f-logo.png", "/assets/icon-192.png", "/assets/icon-512.png", "/assets/icon-maskable-512.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("f4f-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || request.headers.has("authorization") || url.pathname === "/js/config.js") return;
  if (request.mode === "navigate") { event.respondWith(fetch(request).catch(() => caches.match("/offline.html"))); return; }
  if (!SHELL.includes(url.pathname)) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
