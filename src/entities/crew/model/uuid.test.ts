import { describe, expect, it } from "vitest";

import { isUuid } from "@/entities/crew/model/uuid";

describe("UUID 검증", () => {
  it("대소문자 16진수 UUID를 허용한다", () => {
    expect(isUuid("a1234567-abcd-1234-abcd-123456789abc")).toBe(true);
    expect(isUuid("A1234567-ABCD-1234-ABCD-123456789ABC")).toBe(true);
  });

  it.each([
    null,
    undefined,
    123,
    "",
    "abc",
    "../settings",
    "a1234567-abcd-1234-abcd-123456789abc/extra",
    "a1234567-abcd-1234-abcd-123456789abc?x=1",
    "g1234567-abcd-1234-abcd-123456789abc",
    " a1234567-abcd-1234-abcd-123456789abc",
    "a1234567abcd1234abcd123456789abc",
  ])("잘못된 식별자 %s를 거부한다", (id) => {
    expect(isUuid(id)).toBe(false);
  });
});
