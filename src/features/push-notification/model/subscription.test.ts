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
    expect(parsePushSubscription({ ...VALID, endpoint: "http://push.test/a" })).toBeNull();
    expect(parsePushSubscription({ ...VALID, keys: { p256dh: "p" } })).toBeNull();
    expect(parsePushSubscription({ ...VALID, keys: null })).toBeNull();
    expect(parsePushSubscription("https://push.test/a")).toBeNull();
    expect(parsePushSubscription(null)).toBeNull();
  });

  it("DB 한도보다 긴 값은 거절한다", () => {
    expect(parsePushSubscription({ ...VALID, endpoint: `https://${"a".repeat(1000)}` })).toBeNull();
    expect(parsePushSubscription({ ...VALID, keys: { auth: "a".repeat(101), p256dh: "p" } })).toBeNull();
  });
});

describe("isPushEndpoint", () => {
  it("https 주소만 받는다", () => {
    expect(isPushEndpoint("https://push.test/a")).toBe(true);
    expect(isPushEndpoint("")).toBe(false);
    expect(isPushEndpoint(42)).toBe(false);
  });
});
