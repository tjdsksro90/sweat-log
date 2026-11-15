import { describe, expect, it } from "vitest";

import { getWorkoutErrorMessage, parseWorkoutInput } from "@/features/workout/model/save-workout-input";
import {
  addExercise,
  addSet,
  createWorkoutFormValues,
  type RunFormValues,
  renameExercise,
  updateSet,
  type WorkoutFormValues,
} from "@/features/workout/model/workout-form";
import { toWorkoutInput } from "@/features/workout/model/workout-input";

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
  values = renameExercise(values, squat.key, "스쿼트");
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

describe("parseWorkoutInput", () => {
  it("폼에서 만든 값은 서버 검증도 통과한다", () => {
    for (const values of [
      runValues({ distanceKm: "10", duration: { hours: "1", minutes: "", seconds: "" } }),
      strengthValues(),
      formOf({ duration: { hours: "", minutes: "45", seconds: "" }, kind: "other" }),
    ]) {
      const input = inputOf(values);
      expect(parseWorkoutInput(input, TODAY)).toEqual({ input, ok: true });
    }
  });

  it("종류와 상세가 맞지 않거나 범위를 벗어난 값을 거절한다", () => {
    const input = inputOf(strengthValues());
    const rejects = (value: unknown) => expect(parseWorkoutInput(value, TODAY).ok).toBe(false);

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
      durationSeconds: 600, // 러닝 시간은 run에만
      exercises: [],
      kind: "run",
      run: { distanceMeters: 5000, durationSeconds: 1500 },
    });
  });

  it("수정 기록의 id와 크루 친구는 그대로 두고, 겹친 친구는 한 번만 남긴다", () => {
    const input = inputOf(
      formOf({ crewId: CREW_ID, duration: { hours: "1", minutes: "", seconds: "" }, id: WORKOUT_ID, kind: "other" }),
    );
    const parsed = parseWorkoutInput({ ...input, companionIds: [FRIEND_ID, FRIEND_ID] }, TODAY);
    expect(parsed).toEqual({ input: { ...input, companionIds: [FRIEND_ID] }, ok: true });
  });

  it("무게의 부동소수 오차는 받는다", () => {
    const input = inputOf(strengthValues());
    const exercises = [{ name: "덤벨", sets: [{ reps: 5, weightKg: 20.33 }] }];
    expect(parseWorkoutInput({ ...input, exercises }, TODAY).ok).toBe(true);
  });
});

describe("getWorkoutErrorMessage", () => {
  it("save_workout 오류 코드를 한국어로 바꾼다", () => {
    expect(getWorkoutErrorMessage({ message: "invalid_companion" })).toBe(
      "함께한 친구는 같은 크루 친구만 고를 수 있어요.",
    );
    expect(getWorkoutErrorMessage({ message: "invalid_workout_detail" })).toBe("입력한 값을 다시 확인해 주세요.");
    expect(getWorkoutErrorMessage(undefined)).toBe("잠시 후 다시 시도해 주세요.");
  });

  it("check 제약 위반(23514)은 입력 오류로 본다", () => {
    const message = 'new row for relation "workouts" violates check constraint "workouts_title_check"';
    expect(getWorkoutErrorMessage({ code: "23514", message })).toBe("입력한 값을 다시 확인해 주세요.");
  });
});
