import { useState } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SegmentedControl } from "@/shared/ui/segmented-control";

function WorkoutKindForm({ name, disabled }: { name?: string; disabled?: boolean }) {
  const [value, setValue] = useState("run");

  return (
    <form aria-label="운동 기록">
      <SegmentedControl
        label="운동 종류"
        name={name}
        value={value}
        onValueChange={setValue}
        disabled={disabled}
        options={[
          { value: "run", label: "러닝" },
          { value: "strength", label: "헬스" },
          { value: "other", label: "기타", disabled: true },
        ]}
      />
    </form>
  );
}

const getFormData = () => new FormData(screen.getByRole("form", { name: "운동 기록" }) as HTMLFormElement);

describe("SegmentedControl", () => {
  it("초깃값과 클릭한 선택값을 이름에 맞춰 FormData에 한 번만 포함한다", async () => {
    const user = userEvent.setup();
    render(<WorkoutKindForm name="kind" />);

    expect(getFormData().getAll("kind")).toEqual(["run"]);
    await user.click(screen.getByRole("button", { name: "헬스" }));

    expect(screen.getByRole("button", { name: "헬스" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "러닝" })).toHaveAttribute("aria-pressed", "false");
    expect(getFormData().getAll("kind")).toEqual(["strength"]);
  });

  it("선택된 항목을 다시 클릭해도 선택과 제출값을 유지한다", async () => {
    const user = userEvent.setup();
    render(<WorkoutKindForm name="kind" />);

    await user.click(screen.getByRole("button", { name: "헬스" }));
    await user.click(screen.getByRole("button", { name: "헬스" }));

    expect(screen.getByRole("button", { name: "헬스" })).toHaveAttribute("aria-pressed", "true");
    expect(getFormData().getAll("kind")).toEqual(["strength"]);
  });

  it("화살표로 이동하고 Space와 Enter로 선택하면 제출값을 갱신한다", async () => {
    const user = userEvent.setup();
    render(<WorkoutKindForm name="kind" />);

    await user.tab();
    expect(screen.getByRole("button", { name: "러닝" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "헬스" })).toHaveFocus();
    await user.keyboard(" ");
    expect(getFormData().get("kind")).toBe("strength");

    await user.keyboard("{ArrowLeft}{Enter}");
    expect(screen.getByRole("button", { name: "러닝" })).toHaveAttribute("aria-pressed", "true");
    expect(getFormData().get("kind")).toBe("run");
  });

  it("비활성 항목은 선택되지 않고 그룹이 비활성이면 제출값도 제외한다", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<WorkoutKindForm name="kind" />);

    await user.click(screen.getByRole("button", { name: "기타" }));
    expect(getFormData().get("kind")).toBe("run");

    rerender(<WorkoutKindForm name="kind" disabled />);
    await user.click(screen.getByRole("button", { name: "헬스" }));
    expect(screen.getByRole("button", { name: "러닝" })).toHaveAttribute("aria-pressed", "true");
    expect(getFormData().has("kind")).toBe(false);
  });

  it("name이 없으면 선택 UI만 제공하고 폼 데이터는 추가하지 않는다", async () => {
    const user = userEvent.setup();
    render(<WorkoutKindForm />);

    await user.click(screen.getByRole("button", { name: "헬스" }));
    expect(screen.getByRole("button", { name: "헬스" })).toHaveAttribute("aria-pressed", "true");
    expect([...getFormData().entries()]).toEqual([]);
  });
});
