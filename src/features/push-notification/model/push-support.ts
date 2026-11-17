/**
 * 이 브라우저에서 알림을 켤 수 있는지.
 *   - ios-install: iOS·iPadOS는 홈 화면에 추가한 앱(16.4+)에서만 웹 푸시가 된다. Safari 탭에서는 PushManager 자체가 없다.
 *   - unsupported: 서비스 워커·PushManager·Notification 중 하나가 없거나, 서버 공개 키가 설정되지 않았다.
 *   - denied: 사용자가 알림 권한을 거부했다. 앱에서 다시 물을 수 없고 브라우저 설정에서 풀어야 한다.
 */
export type PushAvailability = "available" | "ios-install" | "unsupported" | "denied";

export type PushEnvironment = {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  hasVapidKey: boolean;
  isIos: boolean;
  isStandalone: boolean;
  permission: NotificationPermission | null;
};

export const getPushAvailability = (env: PushEnvironment): PushAvailability => {
  if (env.isIos && !env.isStandalone) return "ios-install";
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification || !env.hasVapidKey) return "unsupported";
  if (env.permission === "denied") return "denied";
  return "available";
};

// iPadOS 13+ Safari는 데스크톱 Mac처럼 보이므로 터치 지점 수로 구분한다.
export const isIosDevice = ({
  userAgent,
  platform,
  maxTouchPoints,
}: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}) => /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);

// VAPID 공개 키(base64url)를 PushManager.subscribe가 받는 바이트로 바꾼다.
export const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};

/**
 * 브라우저에 남은 구독이 지금 VAPID 공개 키로 만든 것인지 본다.
 * 키를 바꾸면 옛 구독으로는 알림이 오지 않고(푸시 서비스 403), 같은 브라우저에서 새 키로 subscribe하면 InvalidStateError가 난다.
 * 구독의 키를 알 수 없으면(오래된 브라우저) 판단하지 않고 그대로 쓴다.
 */
export const isCurrentServerKey = (subscriptionKey: ArrayBuffer | null | undefined, currentKey: Uint8Array) => {
  if (!subscriptionKey || currentKey.length === 0) return true;
  const bytes = new Uint8Array(subscriptionKey);
  return bytes.length === currentKey.length && bytes.every((byte, index) => byte === currentKey[index]);
};
