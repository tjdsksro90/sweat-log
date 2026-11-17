import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LeaveCrew } from "./leave-crew";
// 다시 불러올 때 시트가 쓰는 Base UI까지 처음 읽느라 jsdom에서 시간 초과가 나지 않게 미리 불러 둔다.
import "@/shared/ui/bottom-sheet";

// 시트 청크를 받지 못한 경우(오프라인, 배포 뒤 예전 청크 404)를 흉내 낸다. failing인 동안 import가 실패한다.
const chunk = vi.hoisted(() => ({ failing: true }));
vi.mock("./leave-crew-sheet", async (importOriginal) => {
  if (chunk.failing) throw new Error("chunk load failed");
  return importOriginal();
});

describe("크루 탈퇴 시트를 불러오지 못하면", () => {
  it("화면을 그대로 두고 안내한 뒤, 다시 누르면 새로 불러와 연다", async () => {
    const user = userEvent.setup();
    render(<LeaveCrew crewId="crew-id" isOwner={false} action={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "크루 나가기" });
    await user.click(trigger);
    expect(await screen.findByRole("alert")).toHaveTextContent("화면을 불러오지 못했어요.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    chunk.failing = false;
    await user.click(trigger);
    expect(await screen.findByRole("dialog", {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.queryByText("화면을 불러오지 못했어요.", { exact: false })).not.toBeInTheDocument();
  }, 30_000);
});
