import { describe, expect, it } from "vitest";

import { SAMPLE_WORKOUTS } from "@/entities/workout/model/fixtures";
import { groupWorkoutsByDate } from "@/pages/workout/list/model/timeline";

describe("timeline", () => {
  it("날짜를 최신순으로 묶고 같은 날의 입력 순서와 원본을 보존한다", () => {
    const sameDay = { ...SAMPLE_WORKOUTS[0], id: "another" };
    const input = Object.freeze([SAMPLE_WORKOUTS[2], SAMPLE_WORKOUTS[0], SAMPLE_WORKOUTS[1], sameDay]);
    const groups = groupWorkoutsByDate(input);
    expect(groups.map((group) => group.date)).toEqual(["2026-11-14", "2026-11-13", "2026-11-11"]);
    expect(groups[0].workouts).toEqual([SAMPLE_WORKOUTS[0], sameDay]);
    expect(input[0]).toBe(SAMPLE_WORKOUTS[2]);
  });

  it("빈 목록과 연도가 바뀌는 목록을 처리한다", () => {
    expect(groupWorkoutsByDate([])).toEqual([]);
    const items = ["2025-12-31", "2026-01-01"].map((workoutDate) => ({ ...SAMPLE_WORKOUTS[0], workoutDate }));
    expect(groupWorkoutsByDate(items).map((group) => group.date)).toEqual(["2026-01-01", "2025-12-31"]);
  });
});
