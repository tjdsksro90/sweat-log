import { describe, expect, it } from "vitest";

import { SAMPLE_STRENGTH_DETAIL } from "@/entities/workout/model/fixtures";
import {
  addExercise,
  addSet,
  changeCrew,
  createWorkoutFormValues,
  fromWorkoutDetail,
  getRunPacePreview,
  getTodayInSeoul,
  isWorkoutFormDirty,
  MAX_SETS_PER_EXERCISE,
  removeExercise,
  removeSet,
  toggleCompanion,
  updateSet,
} from "@/features/workout/model/workout-form";

describe("workout-form", () => {
  it("오늘 날짜는 한국 시간 기준이다", () => {
    // UTC 15:30은 한국 시간으로 다음 날 00:30
    expect(getTodayInSeoul(new Date("2026-11-14T15:30:00Z"))).toBe("2026-11-15");
    expect(getTodayInSeoul(new Date("2026-11-14T14:59:00Z"))).toBe("2026-11-14");
  });

  it("새 폼은 오늘 날짜, 러닝, 빈 종목 하나로 시작한다", () => {
    const values = createWorkoutFormValues("2026-11-15");
    expect(values.workoutDate).toBe("2026-11-15");
    expect(values.kind).toBe("run");
    expect(values.id).toBeNull();
    expect(values.exercises.length).toBe(1);
    expect(values.exercises[0].sets.length).toBe(1);
  });

  it("새 세트는 직전 세트의 무게와 횟수를 복사한다", () => {
    let values = createWorkoutFormValues("2026-11-15");
    const exercise = values.exercises[0];
    values = updateSet(values, exercise.key, exercise.sets[0].key, { reps: "10", weightKg: "60" });
    values = addSet(values, exercise.key);

    const [first, second] = values.exercises[0].sets;
    expect([second.weightKg, second.reps]).toEqual(["60", "10"]);
    expect(second.key).not.toBe(first.key);
  });

  it("세트는 최대 개수에서 더 늘지 않는다", () => {
    let values = createWorkoutFormValues("2026-11-15");
    const key = values.exercises[0].key;
    for (let i = 0; i < MAX_SETS_PER_EXERCISE + 5; i += 1) values = addSet(values, key);
    expect(values.exercises[0].sets.length).toBe(MAX_SETS_PER_EXERCISE);
  });

  it("마지막 종목·세트를 지우면 빈 것 하나가 남는다", () => {
    let values = createWorkoutFormValues("2026-11-15");
    const exercise = values.exercises[0];

    values = removeSet(values, exercise.key, exercise.sets[0].key);
    expect(values.exercises[0].sets.length).toBe(1);
    expect(values.exercises[0].sets[0].key).not.toBe(exercise.sets[0].key);

    values = addExercise(values);
    values = removeExercise(values, values.exercises[1].key);
    expect(values.exercises.length).toBe(1);

    values = removeExercise(values, values.exercises[0].key);
    expect(values.exercises.length).toBe(1);
    expect(values.exercises[0].name).toBe("");
  });

  it("크루를 바꾸면 새 크루에 없는 친구는 빠지고, 크루를 비우면 모두 빠진다", () => {
    let values = changeCrew(createWorkoutFormValues("2026-11-15"), "crew-1", ["a", "b"]);
    values = toggleCompanion(toggleCompanion(values, "a"), "b");
    expect(values.companionIds).toEqual(["a", "b"]);

    values = changeCrew(values, "crew-2", ["b", "c"]);
    expect(values.companionIds).toEqual(["b"]);

    values = toggleCompanion(values, "b");
    expect(values.companionIds).toEqual([]);

    values = changeCrew(toggleCompanion(values, "c"), null);
    expect(values.crewId).toBeNull();
    expect(values.companionIds).toEqual([]);
  });

  it("러닝 입력 중 페이스를 바로 보여준다", () => {
    const run = { distanceKm: "5", duration: { hours: "", minutes: "27", seconds: "30" } };
    expect(getRunPacePreview(run)).toBe("5'30\"");
    expect(getRunPacePreview({ ...run, distanceKm: "" })).toBe("-");
    expect(getRunPacePreview({ ...run, distanceKm: "abc" })).toBe("-");
    expect(getRunPacePreview({ ...run, duration: { hours: "", minutes: "", seconds: "" } })).toBe("-");
  });

  it("수정 화면은 기록 상세를 폼 값으로 되돌린다", () => {
    const values = fromWorkoutDetail(SAMPLE_STRENGTH_DETAIL);
    expect(values.id).toBe(SAMPLE_STRENGTH_DETAIL.id);
    expect(values.kind).toBe("strength");
    expect(values.title).toBe("하체 데이");
    expect(values.memo).toBe("스쿼트 무게 올림");
    expect(values.crewId).toBeNull();
    expect(values.duration).toEqual({ hours: "1", minutes: "5", seconds: "0" });
    expect(values.exercises[1].sets.map((set) => [set.weightKg, set.reps])).toEqual([
      ["20", "12"],
      ["20", "12"],
      ["", "15"],
    ]);
    // 다른 종류 입력은 비어 있다
    expect(values.run.distanceKm).toBe("");
  });

  it("러닝 기록은 거리를 km로, 시간을 시·분·초로 되돌린다", () => {
    const values = fromWorkoutDetail({
      ...SAMPLE_STRENGTH_DETAIL,
      crew: { id: "crew-1", name: "새벽러닝" },
      companions: [{ id: "friend-1", nickname: "지은" }],
      durationSeconds: null,
      exercises: [],
      kind: "run",
      run: { distanceMeters: 7200, durationSeconds: 2430 },
    });
    expect(values.run).toEqual({ distanceKm: "7.2", duration: { hours: "", minutes: "40", seconds: "30" } });
    expect(values.crewId).toBe("crew-1");
    expect(values.companionIds).toEqual(["friend-1"]);
    expect(values.exercises.length).toBe(1);
  });

  it("처음 값과 달라졌을 때만 작성 중으로 본다", () => {
    const initial = fromWorkoutDetail(SAMPLE_STRENGTH_DETAIL);
    // 같은 기록을 다시 펼치면 key만 다르다
    expect(isWorkoutFormDirty(initial, fromWorkoutDetail(SAMPLE_STRENGTH_DETAIL))).toBe(false);
    expect(isWorkoutFormDirty(initial, { ...initial, memo: "추가" })).toBe(true);
    expect(isWorkoutFormDirty(initial, addSet(initial, initial.exercises[0].key))).toBe(true);
  });
});
