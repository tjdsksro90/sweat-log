import {
  getWorkoutErrorMessage,
  parseWorkoutInput,
  toSaveWorkoutPayload,
} from "@/features/workout/model/save-workout-input";
import {
  addExercise,
  addSet,
  createWorkoutFormValues,
  renameExercise,
  updateSet,
} from "@/features/workout/model/workout-form";
import { toWorkoutInput } from "@/features/workout/model/workout-input";

import assert from "node:assert/strict";
import { test } from "node:test";

const TODAY = "2026-11-15";
const CREW_ID = "00000000-0000-0000-0000-0000000000c1";
const FRIEND_ID = "00000000-0000-0000-0000-00000000000b";
const WORKOUT_ID = "00000000-0000-0000-0000-000000000101";

const runValues = (run) => ({ ...createWorkoutFormValues(TODAY), kind: "run", run });

const strengthValues = () => {
  let values = { ...createWorkoutFormValues(TODAY), kind: "strength" };
  const squat = values.exercises[0];
  values = renameExercise(values, squat.key, " 스쿼트 ");
  values = updateSet(values, squat.key, squat.sets[0].key, { reps: "10", weightKg: "60.5" });
  values = addSet(values, squat.key);
  values = addExercise(values);
  const pushUp = values.exercises[1];
  values = renameExercise(values, pushUp.key, "푸시업");
  values = updateSet(values, pushUp.key, pushUp.sets[0].key, { reps: "20", weightKg: "" });
  return values;
};

test("폼에서 만든 값은 서버 검증도 통과한다", () => {
  for (const values of [
    runValues({ distanceKm: "10", duration: { hours: "1", minutes: "", seconds: "" } }),
    strengthValues(),
    { ...createWorkoutFormValues(TODAY), duration: { hours: "", minutes: "45", seconds: "" }, kind: "other" },
  ]) {
    const { input } = toWorkoutInput(values, TODAY);
    assert.deepEqual(parseWorkoutInput(input, TODAY), { input, ok: true });
  }
});

test("서버는 종류와 상세가 맞지 않거나 범위를 벗어난 값을 거절한다", () => {
  const { input } = toWorkoutInput(strengthValues(), TODAY);
  const rejects = (value) => assert.equal(parseWorkoutInput(value, TODAY).ok, false);

  rejects(null);
  rejects({ ...input, kind: "swim" });
  rejects({ ...input, workoutDate: "2026-11-16" });
  rejects({ ...input, id: "not-uuid" });
  rejects({ ...input, crewId: "crew" });
  rejects({ ...input, companionIds: [FRIEND_ID] }); // 크루 없이 친구
  rejects({ ...input, exercises: [] }); // 헬스인데 종목 없음
  rejects({ ...input, run: { distanceMeters: 1000, durationSeconds: 300 } });
  rejects({ ...input, exercises: [{ name: "스쿼트", sets: [] }] });
  rejects({ ...input, exercises: [{ name: "스쿼트", sets: [{ reps: 0, weightKg: null }] }] });
  rejects({ ...input, exercises: [{ name: "스쿼트", sets: [{ reps: 5, weightKg: 60.123 }] }] });
  rejects({ ...input, title: "가".repeat(51) });
  rejects({ ...input, durationSeconds: 1.5 });
  rejects({ ...input, durationSeconds: null, exercises: [], kind: "other" }); // 기타인데 시간 없음
  rejects({
    ...input,
    durationSeconds: 600,
    exercises: [],
    kind: "run",
    run: { distanceMeters: 5000, durationSeconds: 1500 },
  });

  // 무게의 부동소수 오차는 받는다
  assert.equal(
    parseWorkoutInput({ ...input, exercises: [{ name: "덤벨", sets: [{ reps: 5, weightKg: 20.33 }] }] }, TODAY).ok,
    true,
  );
});

test("서버로 보낼 때 snake_case로 바꾼다", () => {
  const { input } = toWorkoutInput(
    {
      ...runValues({ distanceKm: "5", duration: { hours: "", minutes: "30", seconds: "" } }),
      companionIds: [FRIEND_ID],
      crewId: CREW_ID,
      id: WORKOUT_ID,
    },
    TODAY,
  );

  assert.deepEqual(toSaveWorkoutPayload(input), {
    companion_ids: [FRIEND_ID],
    crew_id: CREW_ID,
    duration_seconds: null,
    exercises: [],
    id: WORKOUT_ID,
    kind: "run",
    memo: null,
    place_name: null,
    run: { distance_meters: 5000, duration_seconds: 1800 },
    title: null,
    workout_date: TODAY,
  });

  const strength = toSaveWorkoutPayload(toWorkoutInput(strengthValues(), TODAY).input);
  assert.equal(strength.id, null);
  assert.deepEqual(strength.exercises[1], { name: "푸시업", sets: [{ reps: 20, weight_kg: null }] });
});

test("save_workout 오류 코드를 한국어로 바꾼다", () => {
  assert.equal(getWorkoutErrorMessage("invalid_companion"), "함께한 친구는 같은 크루 친구만 고를 수 있어요.");
  assert.equal(getWorkoutErrorMessage("invalid_workout_detail"), "입력한 값을 다시 확인해 주세요.");
  assert.equal(getWorkoutErrorMessage(undefined), "잠시 후 다시 시도해 주세요.");
});

test("check 제약 위반(23514)은 입력 오류로 본다", () => {
  assert.equal(
    getWorkoutErrorMessage('new row for relation "workouts" violates check constraint "workouts_title_check"'),
    "입력한 값을 다시 확인해 주세요.",
  );
});
