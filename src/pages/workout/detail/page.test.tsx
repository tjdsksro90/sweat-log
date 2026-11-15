import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getWorkoutDetail } from "@/entities/workout/api/server-queries";
import { SAMPLE_STRENGTH_DETAIL } from "@/entities/workout/model/fixtures";

import { WorkoutDetailPage } from "./index";

vi.mock("@/entities/workout/api/server-queries", () => ({ getWorkoutDetail: vi.fn() }));
// 댓글은 async Server Component라 Vitest가 렌더링하지 못하므로 자리만 확인한다.
vi.mock("@/features/workout-comment/ui/workout-comments", () => ({
  WorkoutComments: ({ workoutId }: { workoutId: string }) => <div data-testid="comments">{workoutId}</div>,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

describe("상세 조회 연결", () => {
  it("URL의 ID로 조회한 기록을 렌더링한다", async () => {
    vi.mocked(getWorkoutDetail).mockResolvedValue(SAMPLE_STRENGTH_DETAIL);
    render(await WorkoutDetailPage({ params: Promise.resolve({ workoutId: SAMPLE_STRENGTH_DETAIL.id }) }));
    expect(getWorkoutDetail).toHaveBeenCalledWith(SAMPLE_STRENGTH_DETAIL.id);
    expect(screen.getByRole("table", { name: "스쿼트" })).toBeInTheDocument();
    expect(screen.getByTestId("comments")).toHaveTextContent(SAMPLE_STRENGTH_DETAIL.id);
  });
  it("없거나 권한 없는 기록의 null 결과는 404로 처리한다", async () => {
    vi.mocked(getWorkoutDetail).mockResolvedValue(null);
    await expect(WorkoutDetailPage({ params: Promise.resolve({ workoutId: "missing" }) })).rejects.toThrow("NOT_FOUND");
  });
  it("조회 실패를 없는 기록으로 숨기지 않는다", async () => {
    vi.mocked(getWorkoutDetail).mockRejectedValue(new Error("조회 실패"));
    await expect(WorkoutDetailPage({ params: Promise.resolve({ workoutId: "id" }) })).rejects.toThrow("조회 실패");
  });
});
