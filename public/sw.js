/**
 * 땀일기 서비스 워커. 홈 화면 설치 조건, 오프라인 안내, 푸시 알림 표시를 맡는다.
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

/**
 * 푸시 알림. 서버(features/push-notification)가 { title, body, url, tag, renotify }를 보낸다.
 * 같은 tag의 알림은 하나로 바뀌고, renotify가 true일 때만 바뀔 때 다시 울린다(연달아 달린 댓글은 조용히 바뀐다).
 * 알림 내용은 캐시와 무관하고, 위 캐시 정책은 바꾸지 않는다.
 */
const DEFAULT_NOTIFICATION = { title: "땀일기", body: "새 소식이 있어요.", url: "/", tag: undefined, renotify: false };

// 앱 안 경로만 연다. 다른 사이트 주소가 오면 홈으로 보낸다.
const toAppUrl = (url) => {
  try {
    const target = new URL(typeof url === "string" ? url : "/", self.location.origin);
    return target.origin === self.location.origin ? target.href : self.location.origin;
  } catch {
    return self.location.origin;
  }
};

self.addEventListener("push", (event) => {
  let data = DEFAULT_NOTIFICATION;
  try {
    data = { ...DEFAULT_NOTIFICATION, ...event.data?.json() };
  } catch {
    // 알 수 없는 내용이어도 userVisibleOnly 약속대로 알림은 띄운다.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      tag: data.tag,
      // tag 없이 renotify만 주면 showNotification이 실패한다.
      renotify: Boolean(data.tag) && data.renotify === true,
      data: { url: toAppUrl(data.url) },
    }),
  );
});

// 알림을 누르면 해당 기록 상세로 간다. 열린 창이 있으면 그 창을 쓰고, 없으면 새로 연다.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = toAppUrl(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const appWindow = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (!appWindow) return self.clients.openWindow(url);
      // 이 서비스 워커가 아직 맡지 않은 창은 navigate가 실패하므로 새 창으로 연다.
      return appWindow
        .focus()
        .then((client) => client.navigate(url))
        .catch(() => self.clients.openWindow(url));
    }),
  );
});
