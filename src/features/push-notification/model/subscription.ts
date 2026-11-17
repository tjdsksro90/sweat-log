export type PushSubscriptionResult = { ok: true } | { ok: false };

// 브라우저 PushSubscription.toJSON()의 모양. 서버 액션은 클라이언트 값이라 다시 검사한다.
export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

// DB check 제약과 같은 한도
const MAX_ENDPOINT_LENGTH = 1000;
const MAX_P256DH_LENGTH = 200;
const MAX_AUTH_LENGTH = 100;

const isText = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maxLength;

export const isPushEndpoint = (value: unknown): value is string =>
  isText(value, MAX_ENDPOINT_LENGTH) && value.startsWith("https://");

export const parsePushSubscription = (value: unknown): PushSubscriptionInput | null => {
  if (typeof value !== "object" || value === null) return null;
  const { endpoint, keys } = value as { endpoint?: unknown; keys?: unknown };
  if (!isPushEndpoint(endpoint) || typeof keys !== "object" || keys === null) return null;
  const { p256dh, auth } = keys as { p256dh?: unknown; auth?: unknown };
  if (!isText(p256dh, MAX_P256DH_LENGTH) || !isText(auth, MAX_AUTH_LENGTH)) return null;
  return { endpoint, keys: { auth, p256dh } };
};
