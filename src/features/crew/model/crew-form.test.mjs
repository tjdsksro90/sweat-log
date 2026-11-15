import {
  getCrewErrorMessage,
  isCrewId,
  normalizeInviteCode,
  validateCrewName,
  validateInviteCode,
} from "@/features/crew/model/crew-form";

import assert from "node:assert/strict";
import { test } from "node:test";

test("크루 이름은 양끝 공백을 제외한 1~30자이며 DB처럼 유니코드 문자로 센다", () => {
  for (const name of [" 가 ", "가".repeat(30), "🏃".repeat(30)]) assert.equal(validateCrewName(name), null);
  for (const name of [null, new File([], "name"), "", " \n\t", "가".repeat(31), "🏃".repeat(31)])
    assert.ok(validateCrewName(name));
});

test("초대 코드는 DB가 발급하는 8자리 16진수이고 소문자와 양끝 공백을 허용한다", () => {
  for (const code of ["01234567", "ABCDEF01", " abcdef01 "]) assert.equal(validateInviteCode(code), null);
  assert.equal(normalizeInviteCode(" abcdef01 "), "ABCDEF01");
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
    assert.ok(validateInviteCode(code));
});

test("가입 오류는 지정된 안내로 바꾸고 내부 오류는 노출하지 않는다", () => {
  assert.equal(getCrewErrorMessage("invalid_invite_code"), "초대 코드를 다시 확인해 주세요.");
  assert.equal(
    getCrewErrorMessage("secret database detail"),
    "크루 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
});

test("크루 식별자는 UUID만 받는다", () => {
  assert.equal(isCrewId("a1234567-abcd-1234-abcd-123456789abc"), true);
  for (const id of [null, "", "../settings", "a1234567-abcd-1234-abcd-123456789abc/extra"])
    assert.equal(isCrewId(id), false);
});
