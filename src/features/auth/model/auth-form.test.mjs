import { getAuthErrorMessage, validateLogin, validateSignup } from "@/features/auth/model/auth-form";

import assert from "node:assert/strict";
import { test } from "node:test";

test("이메일 형식과 비밀번호 길이를 확인한다", () => {
  assert.equal(validateLogin("runner@example.com", "123456"), null);
  assert.equal(validateLogin("runner", "123456"), "이메일 형식을 확인해 주세요.");
  assert.equal(validateLogin("runner@example.com", "123"), "비밀번호는 6자 이상이에요.");
});

test("닉네임은 공백을 뺀 1~20자만 받는다", () => {
  assert.equal(validateSignup("runner@example.com", "123456", " 땀쟁이 "), null);
  assert.equal(validateSignup("runner@example.com", "123456", "  "), "닉네임은 1~20자로 적어 주세요.");
});

test("Supabase 오류를 한국어로 바꾼다", () => {
  assert.equal(getAuthErrorMessage("Invalid login credentials"), "이메일 또는 비밀번호가 맞지 않아요.");
  assert.equal(getAuthErrorMessage("unknown"), "잠시 후 다시 시도해 주세요.");
});
