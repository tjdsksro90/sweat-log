import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { CrewFormState } from "../model/crew-form";
import { LeaveCrew } from "./leave-crew";
// 시트는 import()로 지연 로딩한다. jsdom에서 첫 import가 느려 시간 초과가 나지 않게 미리 불러 둔다.
import "./leave-crew-sheet";

describe("크루 탈퇴", () => {
  it("크루장에게 탈퇴 버튼 대신 안내를 보여준다", () => {
    render(<LeaveCrew crewId="crew-id" isOwner action={vi.fn()} />);
    expect(screen.getByText("크루장은 크루를 나갈 수 없어요.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("취소하면 요청하지 않고, 확인 후 오류가 나면 시트를 유지한다", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_state: CrewFormState, _data: FormData) => ({ error: "다시 시도해 주세요." }));
    render(<LeaveCrew crewId="crew-id" isOwner={false} action={action} />);
    await user.click(screen.getByRole("button", { name: "크루 나가기" }));
    await user.click(await screen.findByRole("button", { name: "취소" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(action).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "크루 나가기" }));
    await user.click(await screen.findByRole("button", { name: "나가기 확인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("다시 시도해 주세요.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(action.mock.calls[0][1].get("crewId")).toBe("crew-id");
  });
  it("열린 시트를 버튼과 연결하고, 닫으면 포커스를 크루 나가기 버튼으로 돌려준다", async () => {
    const user = userEvent.setup();
    render(<LeaveCrew crewId="crew-id" isOwner={false} action={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "크루 나가기" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).not.toHaveAttribute("aria-controls");
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", dialog.id);
    await user.click(screen.getByRole("button", { name: "취소" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
