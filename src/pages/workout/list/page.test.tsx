import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getWorkoutPage } from "@/entities/workout/api/server-queries";
import { SAMPLE_WORKOUTS } from "@/entities/workout/model/fixtures";

import { WorkoutListPage } from "./index";

vi.mock("@/entities/workout/api/server-queries", () => ({ getWorkoutPage: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("목록 조회 연결", () => {
  it("타임라인의 종류와 불투명 커서를 그대로 전달한다", async () => {
    vi.mocked(getWorkoutPage).mockResolvedValue({ items: SAMPLE_WORKOUTS.slice(0, 1), nextCursor: "next" });
    render(await WorkoutListPage({ searchParams: Promise.resolve({ kind: "run", cursor: "opaque" }) }));
    expect(getWorkoutPage).toHaveBeenLastCalledWith({ kind: "run", cursor: "opaque" });
    expect(screen.getByRole("link", { name: "기록하기" })).toHaveAttribute("href", "/workouts/new");
    expect(screen.getByRole("button", { name: "더 보기" })).toBeInTheDocument();
  });
  it("달력은 월의 모든 페이지를 읽어 마지막 페이지의 운동도 표시한다", async () => {
    vi.mocked(getWorkoutPage)
      .mockResolvedValueOnce({ items: SAMPLE_WORKOUTS.slice(0, 2), nextCursor: "next" })
      .mockResolvedValueOnce({ items: SAMPLE_WORKOUTS.slice(2), nextCursor: null });
    render(
      await WorkoutListPage({
        searchParams: Promise.resolve({ view: "calendar", month: "2026-11", cursor: "ignored" }),
      }),
    );
    expect(getWorkoutPage).toHaveBeenLastCalledWith({
      kind: undefined,
      from: "2026-11-01",
      to: "2026-11-30",
      cursor: "next",
    });
    expect(screen.getByRole("button", { name: "2026-11-11, 기타" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
  });
});
