import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { CrewFormState } from "../model/crew-form";
import { CrewEntryForm } from "./crew-entry-form";

describe("크루 생성·가입 폼", () => {
  it.each([
    { mode: "create" as const, label: "크루 이름", button: "크루 만들기", field: "name", value: "새벽 러너" },
    { mode: "join" as const, label: "초대 코드", button: "코드로 가입하기", field: "inviteCode", value: "abcd1234" },
  ])("$mode 입력을 전달하고 서버 오류를 입력과 연결한다", async ({ mode, label, button, field, value }) => {
    const user = userEvent.setup();
    const action = vi.fn(async (_state: CrewFormState, _data: FormData) => ({
      error: "초대 코드를 다시 확인해 주세요.",
    }));
    render(<CrewEntryForm mode={mode} action={action} />);
    await user.type(screen.getByLabelText(label), value);
    await user.click(screen.getByRole("button", { name: button }));
    expect(await screen.findByRole("alert")).toHaveTextContent("초대 코드를 다시 확인해 주세요.");
    expect(action.mock.calls[0][1].get(field)).toBe(value);
    expect(screen.getByLabelText(label)).toHaveAttribute("aria-invalid", "true");
  });

  it("처리 중에는 중복 제출을 막는다", async () => {
    const user = userEvent.setup();
    let finish!: (state: CrewFormState) => void;
    const action = vi.fn(
      () =>
        new Promise<CrewFormState>((resolve) => {
          finish = resolve;
        }),
    );
    render(<CrewEntryForm mode="create" action={action} />);
    await user.type(screen.getByLabelText("크루 이름"), "러너");
    await user.click(screen.getByRole("button", { name: "크루 만들기" }));
    expect(screen.getByRole("button", { name: "처리 중…" })).toBeDisabled();
    expect(screen.getByLabelText("크루 이름")).toBeDisabled();
    await act(async () => finish({ error: "다시 시도해 주세요." }));
    expect(screen.getByRole("button", { name: "크루 만들기" })).toBeEnabled();
  });
});
