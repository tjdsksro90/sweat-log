/**
 * 땀일기 서비스 워커. 홈 화면 설치 조건과 오프라인 안내만 맡는다.
 *
 * 화면(HTML), RSC, Server Action, Supabase 요청은 사용자마다 내용이 달라 절대 캐시하지 않는다.
 * 캐시에 넣는 것은 빌드 해시가 붙은 /_next/static 파일, 아이콘, 오프라인 안내 페이지뿐이다.
 * 그래서 로그아웃 후 다른 계정으로 로그인해도 이전 사용자의 화면이 캐시에서 나오지 않는다.
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `sweat-log-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("sweat-log-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isCacheableStatic = (url) =>
  url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Server Action(POST)과 Supabase(다른 origin) 요청은 손대지 않는다.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 화면 이동은 항상 네트워크로 받고 저장하지 않는다. 연결이 끊겼을 때만 안내 페이지를 보여 준다.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((response) => response ?? Response.error()),
      ),
    );
    return;
  }

  // 파일명에 빌드 해시가 붙어 내용이 바뀌지 않는 정적 자산만 cache-first로 둔다.
  if (isCacheableStatic(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ??
            fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            }),
        ),
      ),
    );
  }

  // 그 밖의 요청(RSC, route handler, 이미지 최적화 등)은 브라우저 기본 동작에 맡긴다.
});
