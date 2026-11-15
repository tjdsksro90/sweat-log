import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldError } from "@/shared/ui/field";

describe("FieldError", () => {
  it("중복 오류와 메시지가 없는 항목을 제외하고 변경된 오류를 표시한다", () => {
    const { rerender } = render(
      <FieldError
        errors={[
          undefined,
          {},
          { message: "" },
          { message: "거리를 입력해 주세요." },
          { message: "거리를 입력해 주세요." },
          { message: "시간을 입력해 주세요." },
        ]}
      />,
    );

    expect(
      within(screen.getByRole("alert"))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["거리를 입력해 주세요.", "시간을 입력해 주세요."]);

    rerender(<FieldError errors={[{ message: "시간을 입력해 주세요." }]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("시간을 입력해 주세요.");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText("거리를 입력해 주세요.")).not.toBeInTheDocument();

    rerender(<FieldError errors={[undefined, {}, { message: "" }]} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("직접 전달한 안내가 있으면 오류 배열보다 우선한다", () => {
    render(
      <FieldError errors={[{ message: "입력 오류" }]}>
        <span>다시 확인해 주세요.</span>
      </FieldError>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("다시 확인해 주세요.");
    expect(screen.queryByText("입력 오류")).not.toBeInTheDocument();
  });
});
