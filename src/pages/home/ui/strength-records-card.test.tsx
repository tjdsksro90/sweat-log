import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StrengthRecordsCard } from "./strength-records-card";

describe("헬스 최고 무게 카드", () => {
  it("빈 상태에서 헬스 기록 작성을 안내한다", () => {
    render(<StrengthRecordsCard records={[]} />);
    expect(screen.getByRole("heading", { name: "아직 헬스 기록이 없어요" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "헬스 기록하기" })).toHaveAttribute("href", "/workouts/new?kind=strength");
  });
  it("무게와 최초 날짜, 맨몸과 0kg를 구분한다", () => {
    render(
      <StrengthRecordsCard
        records={[
          { exerciseName: "벤치프레스", maxWeightKg: 82.5, workoutDate: "2026-11-15", workoutId: "a", workoutCount: 4 },
          { exerciseName: "풀업", maxWeightKg: null, workoutDate: "2026-11-14", workoutId: "b", workoutCount: 2 },
          { exerciseName: "케이블크런치", maxWeightKg: 0, workoutDate: "2026-11-13", workoutId: "c", workoutCount: 1 },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: /벤치프레스.*82.5/ })).toHaveAttribute("href", "/workouts/a");
    expect(screen.getByText("4회 기록 · 최초 달성 2026.11.15")).toBeInTheDocument();
    expect(screen.getByText("맨몸")).toBeInTheDocument();
    expect(screen.getByText("무게 기록 없음")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /케이블크런치.*0/ })).toHaveTextContent("0kg");
  });
});
