import { getPushAvailability, isIosDevice, type PushAvailability, urlBase64ToUint8Array } from "../model/push-support";

// 브라우저 PushSubscription에서 화면이 쓰는 부분. 테스트에서는 가짜로 바꿔 넣는다.
export type BrowserSubscription = { endpoint: string; toJSON: () => unknown; unsubscribe: () => Promise<boolean> };

export type PushBrowser = {
  getAvailability: () => PushAvailability;
  getSubscription: () => Promise<BrowserSubscription | null>;
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: () => Promise<BrowserSubscription>;
};

// 서비스 워커는 프로덕션 빌드에서만 등록된다(ServiceWorkerRegistration). 개발 서버에서는 ready가 끝나지 않으므로 기다리는 시간을 둔다.
const REGISTRATION_TIMEOUT_MS = 5000;

const getRegistration = async () => {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), REGISTRATION_TIMEOUT_MS)),
  ]);
};

export const browserPush: PushBrowser = {
  getAvailability: () =>
    getPushAvailability({
      hasNotification: "Notification" in window,
      hasPushManager: "PushManager" in window,
      hasServiceWorker: "serviceWorker" in navigator,
      hasVapidKey: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      isIos: isIosDevice({
        maxTouchPoints: navigator.maxTouchPoints,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
      }),
      isStandalone:
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
      permission: "Notification" in window ? Notification.permission : null,
    }),
  getSubscription: async () => {
    const registration = await navigator.serviceWorker.getRegistration("/");
    return (await registration?.pushManager.getSubscription()) ?? null;
  },
  requestPermission: () => Notification.requestPermission(),
  subscribe: async () => {
    const registration = await getRegistration();
    if (!registration) throw new Error("service_worker_unavailable");
    return registration.pushManager.subscribe({
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""),
      userVisibleOnly: true,
    });
  },
};

/**
 * 로그아웃 전에 이 브라우저의 구독을 끊는다. 다음에 같은 브라우저로 다른 계정이 로그인해도
 * 이전 계정의 알림이 오지 않게 한다. 실패해도 로그아웃은 계속한다.
 */
export const forgetBrowserPush = async (
  deleteSubscription: (endpoint: string) => Promise<unknown>,
  browser: Pick<PushBrowser, "getSubscription"> = browserPush,
) => {
  try {
    if (!("serviceWorker" in navigator)) return;
    const subscription = await browser.getSubscription();
    if (!subscription) return;
    await deleteSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  } catch {
    // 남은 구독은 다음 발송 때 410 응답으로 정리된다.
  }
};
