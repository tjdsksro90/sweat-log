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
    expect(screen.queryByLabelText("비밀번호 확인")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
    unmount();

    render(<AuthForm action={action} mode="signup" />);
    expect(screen.getByLabelText("닉네임")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호 확인")).toHaveAttribute("autocomplete", "new-password");
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

  it("가입할 때 비밀번호 확인이 다르면 알려 주고 제출하지 않는다", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<AuthFormState> => ({ error: null }));

    render(<AuthForm action={action} mode="signup" />);
    await user.type(screen.getByLabelText("이메일"), "runner@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "123456");
    await user.type(screen.getByLabelText("비밀번호 확인"), "123457");
    await user.type(screen.getByLabelText("닉네임"), "땀쟁이");

    const confirm = screen.getByLabelText("비밀번호 확인");
    expect(screen.getByRole("alert")).toHaveTextContent("비밀번호가 서로 달라요.");
    expect(confirm).toHaveAttribute("aria-invalid", "true");
    expect(confirm).toHaveAccessibleDescription("비밀번호가 서로 달라요.");
    expect(confirm).toBeInvalid();

    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(action).not.toHaveBeenCalled();
  });

  it("가입할 때 비밀번호 확인이 같으면 오류 없이 확인 값까지 action에 넘긴다", async () => {
    const user = userEvent.setup();
    const action = vi.fn(
      async (_state: AuthFormState, _formData: FormData): Promise<AuthFormState> => ({ error: null }),
    );

    render(<AuthForm action={action} mode="signup" />);
    await user.type(screen.getByLabelText("이메일"), "runner@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "123456");
    await user.type(screen.getByLabelText("비밀번호 확인"), "123456");
    await user.type(screen.getByLabelText("닉네임"), "땀쟁이");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호 확인")).not.toHaveAttribute("aria-invalid");

    await user.click(screen.getByRole("button", { name: "가입하기" }));
    await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());
    const formData = action.mock.calls[0][1];
    expect(formData.get("password")).toBe("123456");
    expect(formData.get("passwordConfirm")).toBe("123456");
  });
  it("비밀번호 보기 버튼을 누르면 글자로 보이고 다시 누르면 가린다", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<AuthFormState> => ({ error: null }));

    render(<AuthForm action={action} mode="login" />);
    const password = screen.getByLabelText("비밀번호");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "비밀번호 보기" }));
    expect(password).toHaveAttribute("type", "text");
    const hideButton = screen.getByRole("button", { name: "비밀번호 숨기기" });
    expect(hideButton).toHaveAttribute("aria-pressed", "true");

    await user.click(hideButton);
    expect(password).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "비밀번호 보기" })).toHaveAttribute("aria-pressed", "false");
    expect(action).not.toHaveBeenCalled();
  });

  it("가입 화면에서 비밀번호와 비밀번호 확인 칸을 따로 보이게 한다", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<AuthFormState> => ({ error: null }));

    render(<AuthForm action={action} mode="signup" />);
    await user.type(screen.getByLabelText("이메일"), "runner@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "123456");
    await user.type(screen.getByLabelText("비밀번호 확인"), "123456");
    await user.type(screen.getByLabelText("닉네임"), "땀쟁이");

    const [passwordToggle, confirmToggle] = screen.getAllByRole("button", { name: "비밀번호 보기" });
    await user.click(confirmToggle);
    expect(screen.getByLabelText("비밀번호 확인")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute("type", "password");
    expect(confirmToggle).toHaveAccessibleName("비밀번호 숨기기");
    expect(passwordToggle).toHaveAccessibleName("비밀번호 보기");

    await user.click(passwordToggle);
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute("type", "text");
    // 폼을 다 채운 상태에서도 토글은 제출하지 않는다.
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByLabelText("비밀번호 확인")).toHaveAttribute("autocomplete", "new-password");
  });
});
