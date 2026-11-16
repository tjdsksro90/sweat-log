import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SAMPLE_WORKOUTS } from "@/entities/workout/model/fixtures";

import type { ListState } from "../model/filters";
import { WorkoutListView } from "./workout-list-view";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const state: ListState = { kind: "all", month: "2026-11", view: "timeline" };

describe("WorkoutListView", () => {
  it("종류 필터와 더 보기를 URL에 반영한다", async () => {
    const user = userEvent.setup();
    render(<WorkoutListView state={state} workouts={SAMPLE_WORKOUTS.slice(0, 2)} nextCursor="opaque_cursor" />);
    await user.click(screen.getByRole("button", { name: "러닝" }));
    expect(push).toHaveBeenLastCalledWith(expect.stringContaining("kind=run"), { scroll: false });
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    expect(push).toHaveBeenLastCalledWith(expect.stringContaining("cursor=opaque_cursor"), { scroll: false });
  });
  it("달력에서 하루를 선택하고 전체 기록으로 돌아온다", async () => {
    const user = userEvent.setup();
    render(<WorkoutListView state={{ ...state, view: "calendar" }} workouts={SAMPLE_WORKOUTS} nextCursor={null} />);
    await user.click(screen.getByRole("button", { name: "2026-11-14, 러닝" }));
    expect(screen.getByRole("link", { name: "한강 새벽 러닝" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "하체 데이" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "월 전체 기록 보기" }));
    expect(screen.getByRole("link", { name: "하체 데이" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "2026-11-15, 운동 없음" }));
    expect(screen.getByText("이날은 기록이 없어요")).toBeInTheDocument();
  });
  it("빈 목록의 운동 기록하기는 고른 종류를 작성 화면에 넘긴다", () => {
    render(<WorkoutListView state={{ ...state, kind: "strength" }} workouts={[]} nextCursor={null} />);
    expect(screen.getByRole("link", { name: "운동 기록하기" })).toHaveAttribute("href", "/workouts/new?kind=strength");
  });
});
