/* 화성복지플랫폼 서비스워커 — 앱 셸 캐시(오프라인 지원) */
const CACHE = "ieum-welfare-v1";
const ASSETS = [
  "./", "./index.html", "./dashboard.html", "./map.html", "./services.html", "./about.html",
  "./css/style.css",
  "./js/main.js", "./js/data.js", "./js/dashboard.js", "./js/nationwide.js",
  "./js/kr-topo.js", "./js/kr-sigungu-topo.js", "./js/sigungu-data.js",
  "./js/kr-map.js", "./js/map.js", "./js/hero-map.js",
  "./js/hwaseong-gu.js", "./js/hwaseong-gu-view.js", "./js/chart.umd.min.js",
  "./logo-mark.png", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // KOSIS 등 외부 API는 항상 네트워크
  if (url.origin !== location.origin) return;
  // 캐시 우선, 없으면 네트워크 후 캐시에 저장
  e.respondWith(
    caches.match(e.request).then((r) =>
      r || fetch(e.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return resp;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
