import { describe, expect, it } from "vitest";

import { getKstToday } from "@/entities/workout/model/weekly-summary";

import { createDemoStore } from "../store";
import { loadWorkoutList } from "./workout-list";

const NOW = new Date("2026-11-16T03:00:00.000Z");
const createStore = () => createDemoStore({ now: () => NOW, storage: () => null });
const month = getKstToday(NOW).slice(0, 7);

describe("loadWorkoutList", () => {
  it("타임라인은 한 페이지(20개)와 다음 커서를 돌려준다", async () => {
    const store = createStore();
    const result = await loadWorkoutList(store.getWorkoutPage, { view: "timeline", kind: "all", month });
    expect(result.workouts).toHaveLength(20);
    expect(result.nextCursor).not.toBeNull();

    const next = await loadWorkoutList(store.getWorkoutPage, {
      view: "timeline",
      kind: "all",
      month,
      cursor: result.nextCursor ?? undefined,
    });
    expect(next.workouts.length).toBeGreaterThan(0);
    expect(next.workouts.some(({ id }) => result.workouts.some((workout) => workout.id === id))).toBe(false);
  });

  it("달력은 그 달의 기록을 페이지를 넘겨 모두 모으고 종류로 거른다", async () => {
    const store = createStore();
    const all = await loadWorkoutList(store.getWorkoutPage, { view: "calendar", kind: "all", month });
    expect(all.nextCursor).toBeNull();
    expect(all.workouts.every((workout) => workout.workoutDate.startsWith(month))).toBe(true);

    const runs = await loadWorkoutList(store.getWorkoutPage, { view: "calendar", kind: "run", month });
    expect(runs.workouts.length).toBeGreaterThan(0);
    expect(runs.workouts.every((workout) => workout.kind === "run")).toBe(true);
  });

  it("저장한 기록이 다시 읽은 목록에 바로 보인다", async () => {
    const store = createStore();
    const saved = await store.saveWorkout({
      kind: "other",
      workoutDate: getKstToday(NOW),
      title: "체험 기록",
      memo: null,
      placeName: null,
      crewId: null,
      companionIds: [],
      durationSeconds: 600,
      run: null,
      exercises: [],
    });
    expect(saved.ok).toBe(true);
    const result = await loadWorkoutList(store.getWorkoutPage, { view: "calendar", kind: "other", month });
    expect(result.workouts.some((workout) => saved.ok && workout.id === saved.id)).toBe(true);
  });
});
