import { describe, expect, it } from "vitest";

import { getPushAvailability, isIosDevice, type PushEnvironment, urlBase64ToUint8Array } from "./push-support";

const CHROME: PushEnvironment = {
  hasNotification: true,
  hasPushManager: true,
  hasServiceWorker: true,
  hasVapidKey: true,
  isIos: false,
  isStandalone: false,
  permission: "default",
};

describe("getPushAvailability", () => {
  it("필요한 API와 공개 키가 있으면 켤 수 있다", () => {
    expect(getPushAvailability(CHROME)).toBe("available");
  });

  it("iOS Safari 탭에서는 홈 화면 설치를 먼저 안내한다", () => {
    expect(getPushAvailability({ ...CHROME, hasPushManager: false, isIos: true })).toBe("ios-install");
  });

  it("홈 화면에 설치한 iOS 앱은 다른 브라우저와 같이 판단한다", () => {
    expect(getPushAvailability({ ...CHROME, isIos: true, isStandalone: true })).toBe("available");
    expect(getPushAvailability({ ...CHROME, hasPushManager: false, isIos: true, isStandalone: true })).toBe(
      "unsupported",
    );
  });

  it("API가 없거나 공개 키가 없으면 지원하지 않는다", () => {
    expect(getPushAvailability({ ...CHROME, hasPushManager: false })).toBe("unsupported");
    expect(getPushAvailability({ ...CHROME, hasServiceWorker: false })).toBe("unsupported");
    expect(getPushAvailability({ ...CHROME, hasNotification: false, permission: null })).toBe("unsupported");
    expect(getPushAvailability({ ...CHROME, hasVapidKey: false })).toBe("unsupported");
  });

  it("권한을 거부했으면 브라우저 설정 안내가 필요하다", () => {
    expect(getPushAvailability({ ...CHROME, permission: "denied" })).toBe("denied");
  });
});

describe("isIosDevice", () => {
  it("iPhone과 iPadOS를 알아본다", () => {
    expect(
      isIosDevice({ maxTouchPoints: 5, platform: "iPhone", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)" }),
    ).toBe(true);
    expect(isIosDevice({ maxTouchPoints: 5, platform: "MacIntel", userAgent: "Mozilla/5.0 (Macintosh)" })).toBe(true);
  });

  it("터치 없는 Mac과 Android는 iOS가 아니다", () => {
    expect(isIosDevice({ maxTouchPoints: 0, platform: "MacIntel", userAgent: "Mozilla/5.0 (Macintosh)" })).toBe(false);
    expect(
      isIosDevice({ maxTouchPoints: 5, platform: "Linux armv8l", userAgent: "Mozilla/5.0 (Linux; Android 15)" }),
    ).toBe(false);
  });
});

describe("urlBase64ToUint8Array", () => {
  it("base64url 문자열을 바이트로 바꾼다", () => {
    expect([...urlBase64ToUint8Array("AQID_-8")]).toEqual([1, 2, 3, 255, 239]);
  });
});
