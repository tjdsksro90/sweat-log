import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AuthFormState } from "@/features/auth/model/auth-form";

import { AuthForm } from "./auth-form";

describe("AuthForm", () => {
  it("로그인 화면에는 닉네임 입력이 없고 가입 화면에는 있다", () => {
    const action = vi.fn(async (): Promise<AuthFormState> => ({ error: null }));

    const { unmount } = render(<AuthForm action={action} mode="login" />);
    expect(screen.queryByLabelText("닉네임")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
    unmount();

    render(<AuthForm action={action} mode="signup" />);
    expect(screen.getByLabelText("닉네임")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "가입하기" })).toBeInTheDocument();
  });

  it("입력한 값을 action에 넘기고 돌려받은 오류를 보여준다", async () => {
    const user = userEvent.setup();
    const action = vi.fn(
      async (_state: AuthFormState, _formData: FormData): Promise<AuthFormState> => ({
        error: "이메일 또는 비밀번호가 맞지 않아요.",
      }),
    );

    render(<AuthForm action={action} mode="login" />);
    await user.type(screen.getByLabelText("이메일"), "runner@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "123456");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("이메일 또는 비밀번호가 맞지 않아요.");
    const formData = action.mock.calls[0][1];
    expect(formData.get("email")).toBe("runner@example.com");
    expect(formData.get("password")).toBe("123456");
  });
});
