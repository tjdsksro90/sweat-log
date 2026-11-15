import {
  addExercise,
  addSet,
  createWorkoutFormValues,
  renameExercise,
  updateSet,
} from "@/features/workout/model/workout-form";
import { setErrorKey, toWorkoutInput, validateWorkoutStep } from "@/features/workout/model/workout-input";

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

test("날짜는 오늘까지만 받는다", () => {
  const values = createWorkoutFormValues(TODAY);
  assert.deepEqual(validateWorkoutStep(values, "basics", TODAY), {});
  assert.equal(
    validateWorkoutStep({ ...values, workoutDate: "2026-11-16" }, "basics", TODAY).workoutDate,
    "오늘 이후 날짜는 기록할 수 없어요.",
  );
  assert.equal(
    validateWorkoutStep({ ...values, workoutDate: "2026-02-30" }, "basics", TODAY).workoutDate,
    "날짜를 골라 주세요.",
  );
  assert.equal(validateWorkoutStep({ ...values, workoutDate: "" }, "basics", TODAY).workoutDate, "날짜를 골라 주세요.");
});

test("러닝은 거리(소수 둘째 자리)와 시간을 받는다", () => {
  const ok = runValues({ distanceKm: "5.23", duration: { hours: "", minutes: "28", seconds: "5" } });
  assert.deepEqual(validateWorkoutStep(ok, "detail"), {});

  const errorsOf = (run) => validateWorkoutStep(runValues(run), "detail");
  const duration = { hours: "", minutes: "30", seconds: "" };
  assert.equal(errorsOf({ distanceKm: "", duration })["run.distanceKm"], "거리를 적어 주세요.");
  assert.equal(errorsOf({ distanceKm: "5.234", duration })["run.distanceKm"], "거리는 소수 둘째 자리까지 적어 주세요.");
  assert.equal(errorsOf({ distanceKm: "0", duration })["run.distanceKm"], "거리는 0.01km부터 500km까지예요.");
  assert.equal(errorsOf({ distanceKm: "501", duration })["run.distanceKm"], "거리는 0.01km부터 500km까지예요.");

  const empty = { hours: "", minutes: "", seconds: "" };
  assert.equal(errorsOf({ distanceKm: "5", duration: empty })["run.duration"], "달린 시간을 적어 주세요.");
  assert.equal(
    errorsOf({ distanceKm: "5", duration: { ...empty, seconds: "60" } })["run.duration"],
    "분과 초는 59까지 적을 수 있어요.",
  );
  assert.equal(
    errorsOf({ distanceKm: "5", duration: { ...empty, hours: "25" } })["run.duration"],
    "시간은 1초부터 24시간까지예요.",
  );
  assert.equal(
    errorsOf({ distanceKm: "5", duration: { ...empty, minutes: "1.5" } })["run.duration"],
    "시간은 숫자로 적어 주세요.",
  );
});

test("러닝 값을 m·초로 바꾸고 전체 시간은 비운다", () => {
  const values = {
    ...runValues({ distanceKm: "7.2", duration: { hours: "", minutes: "40", seconds: "30" } }),
    // 헬스·기타에서 적다 온 값은 러닝 저장에 섞이지 않는다
    duration: { hours: "1", minutes: "", seconds: "" },
    memo: "  ",
    placeName: " 반포한강공원 ",
    title: "한강 새벽 러닝",
  };
  const result = toWorkoutInput(values, TODAY);

  assert.equal(result.ok, true);
  assert.deepEqual(result.input, {
    companionIds: [],
    crewId: null,
    durationSeconds: null,
    exercises: [],
    kind: "run",
    memo: null,
    placeName: "반포한강공원",
    run: { distanceMeters: 7200, durationSeconds: 2430 },
    title: "한강 새벽 러닝",
    workoutDate: TODAY,
  });
});

test("헬스는 종목 이름과 세트 횟수를 확인하고, 무게를 비우면 맨몸 운동이다", () => {
  const values = strengthValues();
  assert.deepEqual(validateWorkoutStep(values, "detail"), {});

  const squat = values.exercises[0];
  const broken = renameExercise(
    updateSet(values, squat.key, squat.sets[1].key, { reps: "", weightKg: "1001" }),
    squat.key,
    "",
  );
  const errors = validateWorkoutStep(broken, "detail");
  assert.equal(errors[`exercises.${squat.key}.name`], "종목 이름을 적어 주세요.");
  assert.equal(errors[setErrorKey(squat.key, squat.sets[1].key, "reps")], "횟수를 적어 주세요.");
  assert.equal(errors[setErrorKey(squat.key, squat.sets[1].key, "weightKg")], "무게는 1000kg까지 적을 수 있어요.");

  const result = toWorkoutInput(values, TODAY);
  assert.equal(result.ok, true);
  assert.deepEqual(result.input.exercises, [
    {
      name: "스쿼트",
      sets: [
        { reps: 10, weightKg: 60.5 },
        { reps: 10, weightKg: 60.5 },
      ],
    },
    { name: "푸시업", sets: [{ reps: 20, weightKg: null }] },
  ]);
  assert.equal(result.input.run, null);
  // 헬스의 전체 시간은 선택
  assert.equal(result.input.durationSeconds, null);
});

test("기타는 전체 운동 시간을 받는다", () => {
  const values = { ...createWorkoutFormValues(TODAY), kind: "other" };
  assert.equal(validateWorkoutStep(values, "detail").duration, "운동한 시간을 적어 주세요.");

  const result = toWorkoutInput({ ...values, duration: { hours: "3", minutes: "", seconds: "" } }, TODAY);
  assert.equal(result.ok, true);
  assert.equal(result.input.durationSeconds, 10800);
  assert.deepEqual(result.input.exercises, []);
  assert.equal(result.input.run, null);
});

test("오류가 있으면 처음 걸린 단계를 알려준다", () => {
  const values = { ...createWorkoutFormValues(TODAY), kind: "other", title: "가".repeat(51) };
  const result = toWorkoutInput(values, TODAY);
  assert.equal(result.ok, false);
  assert.equal(result.step, "detail");

  const finishOnly = toWorkoutInput({ ...values, duration: { hours: "1", minutes: "", seconds: "" } }, TODAY);
  assert.equal(finishOnly.step, "finish");
  assert.equal(finishOnly.errors.title, "제목은 50자까지예요.");
});

test("수정이면 id를 넣고, 함께한 친구는 크루가 있을 때만 보낸다", () => {
  const base = {
    ...createWorkoutFormValues(TODAY),
    companionIds: [FRIEND_ID, FRIEND_ID],
    crewId: CREW_ID,
    duration: { hours: "1", minutes: "", seconds: "" },
    id: WORKOUT_ID,
    kind: "other",
  };
  const result = toWorkoutInput(base, TODAY);
  assert.equal(result.input.id, WORKOUT_ID);
  assert.deepEqual(result.input.companionIds, [FRIEND_ID]);

  assert.deepEqual(toWorkoutInput({ ...base, crewId: null }, TODAY).input.companionIds, []);
  assert.equal("id" in toWorkoutInput({ ...base, id: null }, TODAY).input, false);
});
