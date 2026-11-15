import { useState } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmSheet } from "@/widgets/workout-form/ui/confirm-sheet";

function DeleteButtonWithSheet({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        기록 삭제
      </button>
      <ConfirmSheet
        open={open}
        title="이 기록을 지울까요?"
        description="지운 기록과 댓글은 되돌릴 수 없어요."
        confirmLabel="삭제"
        destructive
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

describe("ConfirmSheet", () => {
  it("열면 취소에 포커스가 가서 Enter로 바로 지워지지 않고, Escape로 닫으면 연 버튼으로 돌아간다", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<DeleteButtonWithSheet onConfirm={onConfirm} />);

    const trigger = screen.getByRole("button", { name: "기록 삭제" });
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole("button", { name: "취소" })).toHaveFocus());

    await user.keyboard("{Enter}");
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole("button", { name: "취소" })).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
