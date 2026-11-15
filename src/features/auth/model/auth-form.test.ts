import { describe, expect, it } from "vitest";

import { getAuthErrorMessage, validateLogin, validateSignup } from "@/features/auth/model/auth-form";

describe("validateLogin", () => {
  it("이메일 형식과 비밀번호 길이를 확인한다", () => {
    expect(validateLogin("runner@example.com", "123456")).toBeNull();
    expect(validateLogin("runner", "123456")).toBe("이메일 형식을 확인해 주세요.");
    expect(validateLogin("runner@example.com", "123")).toBe("비밀번호는 6자 이상이에요.");
  });
});

describe("validateSignup", () => {
  const input = { email: "runner@example.com", password: "123456", passwordConfirm: "123456", nickname: "땀쟁이" };

  it("닉네임은 공백을 뺀 1~20자만 받는다", () => {
    expect(validateSignup({ ...input, nickname: " 땀쟁이 " })).toBeNull();
    expect(validateSignup({ ...input, nickname: "  " })).toBe("닉네임은 1~20자로 적어 주세요.");
  });

  it("비밀번호 확인 값이 비밀번호와 같아야 한다", () => {
    expect(validateSignup(input)).toBeNull();
    expect(validateSignup({ ...input, passwordConfirm: "123457" })).toBe("비밀번호가 서로 달라요.");
    expect(validateSignup({ ...input, passwordConfirm: "" })).toBe("비밀번호가 서로 달라요.");
  });

  it("비밀번호 길이 오류를 일치 검사보다 먼저 알려 준다", () => {
    expect(validateSignup({ ...input, password: "123", passwordConfirm: "1234" })).toBe("비밀번호는 6자 이상이에요.");
  });
});

describe("getAuthErrorMessage", () => {
  it("Supabase 오류를 한국어로 바꾼다", () => {
    expect(getAuthErrorMessage("Invalid login credentials")).toBe("이메일 또는 비밀번호가 맞지 않아요.");
    expect(getAuthErrorMessage("unknown")).toBe("잠시 후 다시 시도해 주세요.");
  });
});
