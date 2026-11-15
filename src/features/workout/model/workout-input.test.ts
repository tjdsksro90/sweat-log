import { describe, expect, it } from "vitest";

import {
  addExercise,
  addSet,
  createWorkoutFormValues,
  type RunFormValues,
  renameExercise,
  updateSet,
  type WorkoutFormValues,
} from "@/features/workout/model/workout-form";
import { setErrorKey, toWorkoutInput, validateWorkoutStep } from "@/features/workout/model/workout-input";

const TODAY = "2026-11-15";
const CREW_ID = "00000000-0000-0000-0000-0000000000c1";
const FRIEND_ID = "00000000-0000-0000-0000-00000000000b";
const WORKOUT_ID = "00000000-0000-0000-0000-000000000101";

const formOf = (patch: Partial<WorkoutFormValues>): WorkoutFormValues => ({
  ...createWorkoutFormValues(TODAY),
  ...patch,
});

const runValues = (run: RunFormValues) => formOf({ kind: "run", run });

const strengthValues = () => {
  let values = formOf({ kind: "strength" });
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

const inputOf = (values: WorkoutFormValues) => {
  const result = toWorkoutInput(values, TODAY);
  if (!result.ok) throw new Error(`검증 실패: ${JSON.stringify(result.errors)}`);
  return result.input;
};

const failureOf = (values: WorkoutFormValues) => {
  const result = toWorkoutInput(values, TODAY);
  if (result.ok) throw new Error("검증을 통과하면 안 된다");
  return result;
};

const ONE_HOUR = { hours: "1", minutes: "", seconds: "" };

describe("validateWorkoutStep", () => {
  it("날짜는 오늘까지만 받는다", () => {
    const values = createWorkoutFormValues(TODAY);
    const dateErrorOf = (workoutDate: string) =>
      validateWorkoutStep({ ...values, workoutDate }, "basics", TODAY).workoutDate;

    expect(validateWorkoutStep(values, "basics", TODAY)).toEqual({});
    expect(dateErrorOf("2026-11-16")).toBe("오늘 이후 날짜는 기록할 수 없어요.");
    expect(dateErrorOf("2026-02-30")).toBe("날짜를 골라 주세요.");
    expect(dateErrorOf("")).toBe("날짜를 골라 주세요.");
  });

  it("러닝은 거리(소수 둘째 자리)와 시간을 받는다", () => {
    const ok = runValues({ distanceKm: "5.23", duration: { hours: "", minutes: "28", seconds: "5" } });
    expect(validateWorkoutStep(ok, "detail")).toEqual({});

    const errorsOf = (run: RunFormValues) => validateWorkoutStep(runValues(run), "detail");
    const duration = { hours: "", minutes: "30", seconds: "" };
    expect(errorsOf({ distanceKm: "", duration })["run.distanceKm"]).toBe("거리를 적어 주세요.");
    expect(errorsOf({ distanceKm: "5.234", duration })["run.distanceKm"]).toBe(
      "거리는 소수 둘째 자리까지 적어 주세요.",
    );
    expect(errorsOf({ distanceKm: "0", duration })["run.distanceKm"]).toBe("거리는 0.01km부터 500km까지예요.");
    expect(errorsOf({ distanceKm: "501", duration })["run.distanceKm"]).toBe("거리는 0.01km부터 500km까지예요.");

    const empty = { hours: "", minutes: "", seconds: "" };
    const durationErrorOf = (patch: Partial<RunFormValues["duration"]>) =>
      errorsOf({ distanceKm: "5", duration: { ...empty, ...patch } })["run.duration"];
    expect(durationErrorOf({})).toBe("달린 시간을 적어 주세요.");
    expect(durationErrorOf({ seconds: "60" })).toBe("분과 초는 59까지 적을 수 있어요.");
    expect(durationErrorOf({ hours: "25" })).toBe("시간은 1초부터 24시간까지예요.");
    expect(durationErrorOf({ minutes: "1.5" })).toBe("시간은 숫자로 적어 주세요.");
  });

  it("헬스는 종목 이름과 세트 횟수·무게를 확인한다", () => {
    const values = strengthValues();
    expect(validateWorkoutStep(values, "detail")).toEqual({});

    const squat = values.exercises[0];
    const broken = renameExercise(
      updateSet(values, squat.key, squat.sets[1].key, { reps: "", weightKg: "1001" }),
      squat.key,
      "",
    );
    const errors = validateWorkoutStep(broken, "detail");
    expect(errors[`exercises.${squat.key}.name`]).toBe("종목 이름을 적어 주세요.");
    expect(errors[setErrorKey(squat.key, squat.sets[1].key, "reps")]).toBe("횟수를 적어 주세요.");
    expect(errors[setErrorKey(squat.key, squat.sets[1].key, "weightKg")]).toBe("무게는 1000kg까지 적을 수 있어요.");
  });

  it("기타는 전체 운동 시간을 받는다", () => {
    expect(validateWorkoutStep(formOf({ kind: "other" }), "detail").duration).toBe("운동한 시간을 적어 주세요.");
  });
});

describe("toWorkoutInput", () => {
  it("러닝 값을 m·초로 바꾸고 전체 시간은 비운다", () => {
    const values = {
      ...runValues({ distanceKm: "7.2", duration: { hours: "", minutes: "40", seconds: "30" } }),
      // 헬스·기타에서 적다 온 값은 러닝 저장에 섞이지 않는다
      duration: ONE_HOUR,
      memo: "  ",
      placeName: " 반포한강공원 ",
      title: "한강 새벽 러닝",
    };

    expect(inputOf(values)).toEqual({
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

  it("헬스 세트를 숫자로 바꾸고, 무게를 비우면 맨몸 운동이다", () => {
    const input = inputOf(strengthValues());
    expect(input.exercises).toEqual([
      {
        name: "스쿼트",
        sets: [
          { reps: 10, weightKg: 60.5 },
          { reps: 10, weightKg: 60.5 },
        ],
      },
      { name: "푸시업", sets: [{ reps: 20, weightKg: null }] },
    ]);
    expect(input.run).toBeNull();
    // 헬스의 전체 시간은 선택
    expect(input.durationSeconds).toBeNull();
  });

  it("기타는 전체 시간만 보낸다", () => {
    const input = inputOf(formOf({ duration: { hours: "3", minutes: "", seconds: "" }, kind: "other" }));
    expect(input.durationSeconds).toBe(10800);
    expect(input.exercises).toEqual([]);
    expect(input.run).toBeNull();
  });

  it("오류가 있으면 처음 걸린 단계를 알려준다", () => {
    const values = formOf({ kind: "other", title: "가".repeat(51) });
    expect(failureOf(values).step).toBe("detail");

    const finishOnly = failureOf({ ...values, duration: ONE_HOUR });
    expect(finishOnly.step).toBe("finish");
    expect(finishOnly.errors.title).toBe("제목은 50자까지예요.");
  });

  it("수정이면 id를 넣고, 함께한 친구는 크루가 있을 때만 보낸다", () => {
    const base = formOf({
      companionIds: [FRIEND_ID, FRIEND_ID],
      crewId: CREW_ID,
      duration: ONE_HOUR,
      id: WORKOUT_ID,
      kind: "other",
    });
    const input = inputOf(base);
    expect(input.id).toBe(WORKOUT_ID);
    expect(input.companionIds).toEqual([FRIEND_ID]);

    expect(inputOf({ ...base, crewId: null }).companionIds).toEqual([]);
    expect("id" in inputOf({ ...base, id: null })).toBe(false);
  });
});
