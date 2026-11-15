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

import assert from "node:assert/strict";
import { test } from "node:test";

test("오늘 날짜는 한국 시간 기준이다", () => {
  // UTC 15:30은 한국 시간으로 다음 날 00:30
  assert.equal(getTodayInSeoul(new Date("2026-11-14T15:30:00Z")), "2026-11-15");
  assert.equal(getTodayInSeoul(new Date("2026-11-14T14:59:00Z")), "2026-11-14");
});

test("새 폼은 오늘 날짜, 러닝, 빈 종목 하나로 시작한다", () => {
  const values = createWorkoutFormValues("2026-11-15");
  assert.equal(values.workoutDate, "2026-11-15");
  assert.equal(values.kind, "run");
  assert.equal(values.id, null);
  assert.equal(values.exercises.length, 1);
  assert.equal(values.exercises[0].sets.length, 1);
});

test("새 세트는 직전 세트의 무게와 횟수를 복사한다", () => {
  let values = createWorkoutFormValues("2026-11-15");
  const exercise = values.exercises[0];
  values = updateSet(values, exercise.key, exercise.sets[0].key, { reps: "10", weightKg: "60" });
  values = addSet(values, exercise.key);

  const [first, second] = values.exercises[0].sets;
  assert.deepEqual([second.weightKg, second.reps], ["60", "10"]);
  assert.notEqual(second.key, first.key);
});

test("세트는 최대 개수에서 더 늘지 않는다", () => {
  let values = createWorkoutFormValues("2026-11-15");
  const key = values.exercises[0].key;
  for (let i = 0; i < MAX_SETS_PER_EXERCISE + 5; i += 1) values = addSet(values, key);
  assert.equal(values.exercises[0].sets.length, MAX_SETS_PER_EXERCISE);
});

test("마지막 종목·세트를 지우면 빈 것 하나가 남는다", () => {
  let values = createWorkoutFormValues("2026-11-15");
  const exercise = values.exercises[0];

  values = removeSet(values, exercise.key, exercise.sets[0].key);
  assert.equal(values.exercises[0].sets.length, 1);
  assert.notEqual(values.exercises[0].sets[0].key, exercise.sets[0].key);

  values = addExercise(values);
  values = removeExercise(values, values.exercises[1].key);
  assert.equal(values.exercises.length, 1);

  values = removeExercise(values, values.exercises[0].key);
  assert.equal(values.exercises.length, 1);
  assert.equal(values.exercises[0].name, "");
});

test("크루를 바꾸면 새 크루에 없는 친구는 빠지고, 크루를 비우면 모두 빠진다", () => {
  let values = changeCrew(createWorkoutFormValues("2026-11-15"), "crew-1", ["a", "b"]);
  values = toggleCompanion(toggleCompanion(values, "a"), "b");
  assert.deepEqual(values.companionIds, ["a", "b"]);

  values = changeCrew(values, "crew-2", ["b", "c"]);
  assert.deepEqual(values.companionIds, ["b"]);

  values = toggleCompanion(values, "b");
  assert.deepEqual(values.companionIds, []);

  values = changeCrew(toggleCompanion(values, "c"), null);
  assert.equal(values.crewId, null);
  assert.deepEqual(values.companionIds, []);
});

test("러닝 입력 중 페이스를 바로 보여준다", () => {
  const run = { distanceKm: "5", duration: { hours: "", minutes: "27", seconds: "30" } };
  assert.equal(getRunPacePreview(run), "5'30\"");
  assert.equal(getRunPacePreview({ ...run, distanceKm: "" }), "-");
  assert.equal(getRunPacePreview({ ...run, distanceKm: "abc" }), "-");
  assert.equal(getRunPacePreview({ ...run, duration: { hours: "", minutes: "", seconds: "" } }), "-");
});

test("수정 화면은 기록 상세를 폼 값으로 되돌린다", () => {
  const values = fromWorkoutDetail(SAMPLE_STRENGTH_DETAIL);
  assert.equal(values.id, SAMPLE_STRENGTH_DETAIL.id);
  assert.equal(values.kind, "strength");
  assert.equal(values.title, "하체 데이");
  assert.equal(values.memo, "스쿼트 무게 올림");
  assert.equal(values.crewId, null);
  assert.deepEqual(values.duration, { hours: "1", minutes: "5", seconds: "0" });
  assert.deepEqual(
    values.exercises[1].sets.map((set) => [set.weightKg, set.reps]),
    [
      ["20", "12"],
      ["20", "12"],
      ["", "15"],
    ],
  );
  // 다른 종류 입력은 비어 있다
  assert.equal(values.run.distanceKm, "");
});

test("러닝 기록은 거리를 km로, 시간을 시·분·초로 되돌린다", () => {
  const values = fromWorkoutDetail({
    ...SAMPLE_STRENGTH_DETAIL,
    crew: { id: "crew-1", name: "새벽러닝" },
    companions: [{ id: "friend-1", nickname: "지은" }],
    durationSeconds: null,
    exercises: [],
    kind: "run",
    run: { distanceMeters: 7200, durationSeconds: 2430 },
  });
  assert.deepEqual(values.run, { distanceKm: "7.2", duration: { hours: "", minutes: "40", seconds: "30" } });
  assert.equal(values.crewId, "crew-1");
  assert.deepEqual(values.companionIds, ["friend-1"]);
  assert.equal(values.exercises.length, 1);
});

test("처음 값과 달라졌을 때만 작성 중으로 본다", () => {
  const initial = fromWorkoutDetail(SAMPLE_STRENGTH_DETAIL);
  // 같은 기록을 다시 펼치면 key만 다르다
  assert.equal(isWorkoutFormDirty(initial, fromWorkoutDetail(SAMPLE_STRENGTH_DETAIL)), false);
  assert.equal(isWorkoutFormDirty(initial, { ...initial, memo: "추가" }), true);
  assert.equal(isWorkoutFormDirty(initial, addSet(initial, initial.exercises[0].key)), true);
});
