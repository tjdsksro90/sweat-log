import { describe, expect, it } from "vitest";

import { isPushEndpoint, parsePushSubscription } from "./subscription";

const VALID = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  expirationTime: null,
  keys: { auth: "a", p256dh: "p" },
};

describe("parsePushSubscription", () => {
  it("브라우저 구독에서 endpoint와 키만 꺼낸다", () => {
    expect(parsePushSubscription(VALID)).toEqual({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { auth: "a", p256dh: "p" },
    });
  });

  it("https가 아니거나 키가 빠진 값은 거절한다", () => {
    expect(parsePushSubscription({ ...VALID, endpoint: "http://fcm.googleapis.com/fcm/send/abc" })).toBeNull();
    expect(parsePushSubscription({ ...VALID, keys: { p256dh: "p" } })).toBeNull();
    expect(parsePushSubscription({ ...VALID, keys: null })).toBeNull();
    expect(parsePushSubscription("https://fcm.googleapis.com/fcm/send/abc")).toBeNull();
    expect(parsePushSubscription(null)).toBeNull();
  });

  it("DB 한도보다 긴 값은 거절한다", () => {
    expect(
      parsePushSubscription({ ...VALID, endpoint: `https://fcm.googleapis.com/fcm/send/${"a".repeat(1000)}` }),
    ).toBeNull();
    expect(parsePushSubscription({ ...VALID, keys: { auth: "a".repeat(101), p256dh: "p" } })).toBeNull();
  });
});

describe("isPushEndpoint", () => {
  it("주요 브라우저의 푸시 서비스 주소를 받는다", () => {
    expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isPushEndpoint("https://wns2-pn1p.notify.windows.com/w/?token=abc")).toBe(true);
    expect(isPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
  });

  it("다른 호스트와 비슷하게 꾸민 주소는 거절한다", () => {
    expect(isPushEndpoint("https://push.test/a")).toBe(false);
    expect(isPushEndpoint("https://fcm.googleapis.com.evil.test/a")).toBe(false);
    expect(isPushEndpoint("https://fcm.googleapis.com@evil.test/a")).toBe(false);
    expect(isPushEndpoint("https://fcm.googleapis.com:8443/a")).toBe(false);
    expect(isPushEndpoint("https://notify.windows.com/a")).toBe(false);
    expect(isPushEndpoint("https://evilnotify.windows.com.test/a")).toBe(false);
    expect(isPushEndpoint("https://fcm.googleapis.com")).toBe(false);
    expect(isPushEndpoint("")).toBe(false);
    expect(isPushEndpoint(42)).toBe(false);
  });
});
