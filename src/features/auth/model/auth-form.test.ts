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
  it("닉네임은 공백을 뺀 1~20자만 받는다", () => {
    expect(validateSignup("runner@example.com", "123456", " 땀쟁이 ")).toBeNull();
    expect(validateSignup("runner@example.com", "123456", "  ")).toBe("닉네임은 1~20자로 적어 주세요.");
  });
});

describe("getAuthErrorMessage", () => {
  it("Supabase 오류를 한국어로 바꾼다", () => {
    expect(getAuthErrorMessage("Invalid login credentials")).toBe("이메일 또는 비밀번호가 맞지 않아요.");
    expect(getAuthErrorMessage("unknown")).toBe("잠시 후 다시 시도해 주세요.");
  });
});
