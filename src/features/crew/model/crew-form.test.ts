import { describe, expect, it } from "vitest";

import {
  getCrewErrorMessage,
  isCrewId,
  normalizeInviteCode,
  validateCrewName,
  validateInviteCode,
} from "@/features/crew/model/crew-form";

describe("크루 입력 검증", () => {
  it("크루 이름은 양끝 공백을 제외한 1~30자이며 DB처럼 유니코드 문자로 센다", () => {
    for (const name of [" 가 ", "가".repeat(30), "🏃".repeat(30)]) expect(validateCrewName(name)).toBeNull();
    for (const name of [null, new File([], "name"), "", " \n\t", "가".repeat(31), "🏃".repeat(31)])
      expect(validateCrewName(name)).toBeTruthy();
  });

  it("초대 코드는 DB가 발급하는 8자리 16진수이고 소문자와 양끝 공백을 허용한다", () => {
    for (const code of ["01234567", "ABCDEF01", " abcdef01 "]) expect(validateInviteCode(code)).toBeNull();
    expect(normalizeInviteCode(" abcdef01 ")).toBe("ABCDEF01");
    for (const code of [
      null,
      new File([], "ABCDEF01"),
      "",
      "ABCDE01",
      "ABCDEF012",
      "GBCDEF01",
      "ABCD EF01",
      "ＡＢＣＤＥＦ０１",
    ])
      expect(validateInviteCode(code)).toBeTruthy();
  });

  it("가입 오류는 지정된 안내로 바꾸고 내부 오류는 노출하지 않는다", () => {
    expect(getCrewErrorMessage("invalid_invite_code")).toBe("초대 코드를 다시 확인해 주세요.");
    expect(getCrewErrorMessage("secret database detail")).toBe(
      "크루 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
    );
  });

  it("크루 식별자는 UUID만 받는다", () => {
    expect(isCrewId("a1234567-abcd-1234-abcd-123456789abc")).toBe(true);
    for (const id of [null, "", "../settings", "a1234567-abcd-1234-abcd-123456789abc/extra"])
      expect(isCrewId(id)).toBe(false);
  });
});
