import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SAMPLE_WORKOUTS } from "@/entities/workout/model/fixtures";

import { WorkoutCard } from "./workout-card";

describe("WorkoutCard", () => {
  it("러닝 수치와 상세 링크, 공유 정보를 보여준다", () => {
    render(<WorkoutCard workout={SAMPLE_WORKOUTS[0]} />);
    expect(screen.getByRole("link", { name: "한강 새벽 러닝" })).toHaveAttribute(
      "href",
      `/workouts/${SAMPLE_WORKOUTS[0].id}`,
    );
    for (const text of ["7.20km", "40:30", "5'38\"", "함께한 친구 · 지은", "공유 크루 · 새벽러닝", "댓글 2개"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });
  it("헬스의 총 볼륨을 표시한다", () => {
    render(<WorkoutCard workout={SAMPLE_WORKOUTS[1]} />);
    expect(screen.getByText("3,720")).toBeInTheDocument();
    expect(screen.getByText("총 볼륨")).toBeInTheDocument();
  });
  it("기타 운동의 시간과 누락된 시간을 구분한다", () => {
    const { rerender } = render(<WorkoutCard workout={SAMPLE_WORKOUTS[2]} />);
    expect(screen.getByText("3:00:00")).toBeInTheDocument();
    rerender(<WorkoutCard workout={{ ...SAMPLE_WORKOUTS[2], durationSeconds: null }} />);
    expect(screen.getByText("미입력")).toBeInTheDocument();
  });
});
