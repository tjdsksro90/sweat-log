export type PushSubscriptionResult = { ok: true } | { ok: false };

// 브라우저 PushSubscription.toJSON()의 모양. 서버 액션은 클라이언트 값이라 다시 검사한다.
export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

// DB check 제약과 같은 한도
const MAX_ENDPOINT_LENGTH = 1000;
const MAX_P256DH_LENGTH = 200;
const MAX_AUTH_LENGTH = 100;

const isText = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maxLength;

/**
 * 주요 브라우저의 푸시 서비스 주소만 받는다. 발송 서버가 이 주소로 직접 요청을 보내므로
 * 아무 https 주소나 받으면 서버를 다른 호스트를 두드리는 데 쓸 수 있다.
 * Chrome 계열 FCM, Firefox, Edge(WNS), Safari. DB check 제약(push_subscriptions.endpoint)과 같은 정규식이다.
 * 호스트 바로 뒤에 /가 와야 해서 fcm.googleapis.com.evil.test, 사용자 정보(@), 포트가 붙은 주소는 거절된다.
 */
const PUSH_ENDPOINT_PATTERN =
  /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.notify\.windows\.com)\//;

export const isPushEndpoint = (value: unknown): value is string =>
  isText(value, MAX_ENDPOINT_LENGTH) && PUSH_ENDPOINT_PATTERN.test(value);

export const parsePushSubscription = (value: unknown): PushSubscriptionInput | null => {
  if (typeof value !== "object" || value === null) return null;
  const { endpoint, keys } = value as { endpoint?: unknown; keys?: unknown };
  if (!isPushEndpoint(endpoint) || typeof keys !== "object" || keys === null) return null;
  const { p256dh, auth } = keys as { p256dh?: unknown; auth?: unknown };
  if (!isText(p256dh, MAX_P256DH_LENGTH) || !isText(auth, MAX_AUTH_LENGTH)) return null;
  return { endpoint, keys: { auth, p256dh } };
};
