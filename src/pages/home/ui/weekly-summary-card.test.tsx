import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SAMPLE_WEEKLY_SUMMARY } from "@/entities/workout/model/fixtures";

import { WeeklySummaryCard } from "./weekly-summary-card";

describe("WeeklySummaryCard", () => {
  it("주간 수치와 7일의 운동 여부를 표시한다", () => {
    render(<WeeklySummaryCard summary={SAMPLE_WEEKLY_SUMMARY} />);
    expect(screen.getByText("7.20km")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getAllByRole("listitem", { name: /운동함/ })).toHaveLength(3);
    expect(screen.getByText("연속 운동")).toBeInTheDocument();
  });
  it("기록이 없는 주에는 첫 기록을 안내한다", () => {
    render(
      <WeeklySummaryCard
        summary={{ ...SAMPLE_WEEKLY_SUMMARY, workoutCount: 0, runDistanceMeters: 0, streakDays: 0, activeDates: [] }}
      />,
    );
    expect(screen.getByText("0.00km")).toBeInTheDocument();
    expect(screen.getByText(/이번 주 첫 움직임/)).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem", { name: /운동함/ })).toHaveLength(0);
  });
});
