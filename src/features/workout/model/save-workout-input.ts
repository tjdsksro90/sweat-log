/**
 * Server Action이 받은 WorkoutInput 검증과 오류 문구. save_workout 입력 변환은 entities/workout/model/workout-mappers. 범위 규칙은 workout-input.ts와 같은 LIMITS를 쓴다.
 * Server Action 인자는 누구나 POST로 보낼 수 있으니 화면 검증만 믿지 않는다.
 */
import type { StrengthExercise, WorkoutInput } from "@/entities/workout/model/contracts";
import { isWorkoutKind } from "@/entities/workout/model/types";

import { getTodayInSeoul, MAX_EXERCISES, MAX_SETS_PER_EXERCISE } from "./workout-form";
import { getDateError, inRange, LIMITS } from "./workout-input";

export type ParseWorkoutInputResult = { ok: true; input: WorkoutInput } | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_PATTERN.test(value);

const isIntegerInRange = (value: unknown, range: { min: number; max: number }): value is number =>
  typeof value === "number" && Number.isInteger(value) && inRange(value, range);

const parseOptionalText = (value: unknown, maxLength: number): { ok: boolean; text: string | null } => {
  if (value === null || value === undefined) return { ok: true, text: null };
  if (typeof value !== "string") return { ok: false, text: null };

  const trimmed = value.trim();
  if (trimmed.length > maxLength) return { ok: false, text: null };
  return { ok: true, text: trimmed.length > 0 ? trimmed : null };
};

const parseExercises = (value: unknown): StrengthExercise[] | null => {
  if (!Array.isArray(value) || value.length > MAX_EXERCISES) return null;

  const exercises: StrengthExercise[] = [];
  for (const exercise of value) {
    if (!isRecord(exercise) || typeof exercise.name !== "string" || !Array.isArray(exercise.sets)) return null;

    const name = exercise.name.trim();
    if (name.length === 0 || name.length > LIMITS.exerciseName) return null;
    if (exercise.sets.length === 0 || exercise.sets.length > MAX_SETS_PER_EXERCISE) return null;

    const sets: StrengthExercise["sets"] = [];
    for (const set of exercise.sets) {
      if (!isRecord(set) || !isIntegerInRange(set.reps, LIMITS.reps)) return null;

      const { weightKg } = set;
      // numeric(6, 2). 부동소수 오차(20.33 * 100 = 2033.0000000000002)는 봐준다.
      const isValidWeight =
        weightKg === null ||
        (typeof weightKg === "number" &&
          inRange(weightKg, LIMITS.weightKg) &&
          Math.abs(weightKg * 100 - Math.round(weightKg * 100)) < 1e-6);
      if (!isValidWeight) return null;

      sets.push({ reps: set.reps, weightKg: weightKg as number | null });
    }

    exercises.push({ name, sets });
  }

  return exercises;
};

const INVALID_INPUT = "입력한 값을 다시 확인해 주세요.";

/**
 * Server Action이 받은 값을 믿을 수 있는 WorkoutInput으로 좁힌다. 오류는 화면에 보여줄 한 문장.
 * 폼 검증을 통과한 값이면 여기서 걸리지 않는다. 걸린다면 화면 버그이거나 직접 보낸 요청이다.
 */
export const parseWorkoutInput = (value: unknown, today = getTodayInSeoul()): ParseWorkoutInputResult => {
  if (!isRecord(value)) return { error: INVALID_INPUT, ok: false };

  const { id, kind, workoutDate, crewId, companionIds, durationSeconds, run } = value;

  if (id !== undefined && !isUuid(id)) return { error: INVALID_INPUT, ok: false };
  if (typeof kind !== "string" || !isWorkoutKind(kind)) return { error: "운동 종류를 골라 주세요.", ok: false };
  if (typeof workoutDate !== "string") return { error: "날짜를 골라 주세요.", ok: false };

  const dateError = getDateError(workoutDate, today);
  if (dateError) return { error: dateError, ok: false };

  if (crewId !== null && !isUuid(crewId)) return { error: INVALID_INPUT, ok: false };
  if (!Array.isArray(companionIds) || !companionIds.every(isUuid)) return { error: INVALID_INPUT, ok: false };
  if (crewId === null && companionIds.length > 0)
    return { error: "함께한 친구는 크루를 고른 뒤 선택해 주세요.", ok: false };

  const title = parseOptionalText(value.title, LIMITS.title);
  const memo = parseOptionalText(value.memo, LIMITS.memo);
  const placeName = parseOptionalText(value.placeName, LIMITS.placeName);
  if (!title.ok || !memo.ok || !placeName.ok) return { error: INVALID_INPUT, ok: false };

  if (durationSeconds !== null && !isIntegerInRange(durationSeconds, LIMITS.durationSeconds)) {
    return { error: INVALID_INPUT, ok: false };
  }

  const exercises = parseExercises(value.exercises);
  if (exercises === null) return { error: INVALID_INPUT, ok: false };

  let parsedRun: WorkoutInput["run"] = null;
  if (run !== null) {
    if (
      !isRecord(run) ||
      !isIntegerInRange(run.distanceMeters, LIMITS.distanceMeters) ||
      !isIntegerInRange(run.durationSeconds, LIMITS.durationSeconds)
    ) {
      return { error: INVALID_INPUT, ok: false };
    }
    parsedRun = { distanceMeters: run.distanceMeters, durationSeconds: run.durationSeconds };
  }

  // 종류와 상세가 맞아야 한다. save_workout의 invalid_workout_detail과 같은 규칙.
  const matchesKind =
    (kind === "run" && parsedRun !== null && exercises.length === 0 && durationSeconds === null) ||
    (kind === "strength" && parsedRun === null && exercises.length > 0) ||
    (kind === "other" && parsedRun === null && exercises.length === 0 && durationSeconds !== null);
  if (!matchesKind) return { error: INVALID_INPUT, ok: false };

  return {
    input: {
      ...(id !== undefined ? { id } : {}),
      companionIds: [...new Set(companionIds)],
      crewId,
      durationSeconds,
      exercises,
      kind,
      memo: memo.text,
      placeName: placeName.text,
      run: parsedRun,
      title: title.text,
      workoutDate,
    },
    ok: true,
  };
};

type WorkoutError = { message: string; code?: string } | null | undefined;

// save_workout·삭제가 던지는 오류를 화면 문구로 바꾼다. 23514(check 제약 위반)는 길이·범위 초과라 입력 오류로 본다.
export const getWorkoutErrorMessage = (error: WorkoutError) => {
  const message = error?.message ?? "";
  if (message.includes("not_authenticated")) return "다시 로그인해 주세요.";
  if (message.includes("workout_not_found")) return "기록을 찾을 수 없어요. 이미 지워졌거나 내 기록이 아니에요.";
  if (message.includes("invalid_crew")) return "내가 속한 크루에만 공유할 수 있어요.";
  if (message.includes("invalid_companion")) return "함께한 친구는 같은 크루 친구만 고를 수 있어요.";
  if (message.includes("invalid_workout") || error?.code === "23514") return INVALID_INPUT;
  return "잠시 후 다시 시도해 주세요.";
};
