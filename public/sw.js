// 최소 서비스 워커: 앱 셸 캐시 + 네트워크 우선(오프라인 시 캐시 폴백)
const CACHE = "work-board-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/vite.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // GET 만, 같은 출처만 처리 (Firebase 등 외부 요청은 그대로 통과)
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/index.html"))),
  );
});
