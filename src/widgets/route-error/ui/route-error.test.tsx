import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RouteError } from "./route-error";

describe("경로 오류 화면", () => {
  it("화면 제목과 한국어 안내를 보여 준다", () => {
    render(<RouteError pageTitle="기록" title="기록을 불러오지 못했어요" retry={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: "기록" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "기록을 불러오지 못했어요" })).toBeInTheDocument();
    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
  });

  it("다시 시도를 누르면 retry를 부른다", async () => {
    const retry = vi.fn();
    render(<RouteError pageTitle="홈" title="화면을 불러오지 못했어요" retry={retry} />);

    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(retry).toHaveBeenCalledOnce();
  });
});
