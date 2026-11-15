import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SAMPLE_STRENGTH_DETAIL } from "@/entities/workout/model/fixtures";

import { WorkoutDetailView } from "./workout-detail-view";

describe("WorkoutDetailView", () => {
  it("종목별 세트와 맨몸 무게, 메모를 표시한다", () => {
    render(<WorkoutDetailView workout={SAMPLE_STRENGTH_DETAIL} />);
    const squat = screen.getByRole("table", { name: "스쿼트" });
    expect(within(squat).getByText("80 kg")).toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: "런지" })).getByText("맨몸")).toBeInTheDocument();
    expect(screen.getByText("스쿼트 무게 올림")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "수정" })).toHaveAttribute(
      "href",
      `/workouts/${SAMPLE_STRENGTH_DETAIL.id}/edit`,
    );
  });
  it("다른 사람의 기록에는 수정 링크를 노출하지 않는다", () => {
    render(<WorkoutDetailView workout={{ ...SAMPLE_STRENGTH_DETAIL, isMine: false }} />);
    expect(screen.queryByRole("link", { name: "수정" })).not.toBeInTheDocument();
  });
});
