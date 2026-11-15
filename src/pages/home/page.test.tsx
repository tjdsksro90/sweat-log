import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getWeeklySummary } from "@/entities/workout/api/server-queries";
import { SAMPLE_WEEKLY_SUMMARY } from "@/entities/workout/model/fixtures";

import { HomePage } from "./index";

vi.mock("@/entities/profile/api/get-my-profile", () => ({ getMyProfile: async () => ({ nickname: "민수" }) }));
vi.mock("@/entities/workout/api/server-queries", () => ({ getWeeklySummary: vi.fn() }));

describe("홈 조회 연결", () => {
  it("실제 요약 결과와 인사말, 작성 링크를 표시한다", async () => {
    vi.mocked(getWeeklySummary).mockResolvedValue(SAMPLE_WEEKLY_SUMMARY);
    render(await HomePage());
    expect(getWeeklySummary).toHaveBeenCalledWith();
    expect(screen.getByText("민수님.")).toHaveClass("text-foreground");
    expect(screen.getByText("7.20km")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "기록하기" })).toHaveAttribute("href", "/workouts/new");
  });
});
