import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CopyInviteCode } from "./copy-invite-code";

describe("초대 코드 복사", () => {
  it("코드를 클립보드에 쓰고 성공을 알린다", async () => {
    const user = userEvent.setup();
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<CopyInviteCode code="ABCDEF12" />);
    await user.click(screen.getByRole("button", { name: "초대 코드 복사" }));
    expect(copy).toHaveBeenCalledWith("ABCDEF12");
    expect(screen.getByRole("status")).toHaveTextContent("초대 코드를 복사했어요.");
  });
  it("클립보드가 거부되면 직접 복사를 안내한다", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<CopyInviteCode code="ABCDEF12" />);
    await user.click(screen.getByRole("button", { name: "초대 코드 복사" }));
    expect(screen.getByRole("status")).toHaveTextContent("직접 복사해 주세요.");
  });
});
