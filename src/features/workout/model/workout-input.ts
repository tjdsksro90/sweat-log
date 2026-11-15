/**
 * 폼 값 → WorkoutInput 변환과 검증. 범위는 DB check 제약(supabase/migrations)과 같게 맞춘다.
 * 화면은 validateWorkoutStep으로 단계마다 막는다. Server Action은 save-workout-input.ts의 parseWorkoutInput으로 한 번 더 확인한다.
 */
import type { StrengthExercise, WorkoutInput } from "@/entities/workout/model/contracts";
import { isWorkoutKind } from "@/entities/workout/model/types";

import {
  type DurationFormValues,
  getTodayInSeoul,
  MAX_EXERCISES,
  MAX_SETS_PER_EXERCISE,
  WORKOUT_FORM_STEPS,
  type WorkoutFormStep,
  type WorkoutFormValues,
} from "./workout-form";

export const LIMITS = {
  distanceMeters: { max: 500_000, min: 1 },
  durationSeconds: { max: 86_400, min: 1 },
  exerciseName: 50,
  memo: 2000,
  placeName: 100,
  reps: { max: 1000, min: 1 },
  title: 50,
  weightKg: { max: 1000, min: 0 },
} as const;

/**
 * 오류는 입력 칸 위치를 key로 둔다. 종목·세트는 폼의 key로 가리킨다.
 * 예: "run.distanceKm", "exercises.<종목 key>.name", "exercises.<종목 key>.sets.<세트 key>.reps"
 */
export type WorkoutFormErrors = Record<string, string>;

export const exerciseErrorKey = (exerciseKey: string) => `exercises.${exerciseKey}`;
export const setErrorKey = (exerciseKey: string, setKey: string, field: "reps" | "weightKg") =>
  `exercises.${exerciseKey}.sets.${setKey}.${field}`;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INTEGER_PATTERN = /^\d+$/;
// 소수 둘째 자리까지. 거리(km)와 무게(kg)가 같은 규칙이다.
const DECIMAL_2_PATTERN = /^\d+(\.\d{1,2})?$/;

const isValidDate = (value: string) => {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const getDateError = (value: string, today: string) => {
  if (!isValidDate(value)) return "날짜를 골라 주세요.";
  // YYYY-MM-DD는 문자열 비교가 곧 날짜 비교다.
  if (value > today) return "오늘 이후 날짜는 기록할 수 없어요.";
  return null;
};

export const inRange = (value: number, range: { min: number; max: number }) => value >= range.min && value <= range.max;

const toNullableText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

type ParsedDuration = { seconds: number | null; error: string | null };

// 시·분·초를 모두 비우면 null(입력 안 함). 하나라도 적었으면 전체를 확인한다.
const parseDuration = (duration: DurationFormValues): ParsedDuration => {
  const parts = [duration.hours, duration.minutes, duration.seconds].map((part) => part.trim());
  if (parts.every((part) => part === "")) return { error: null, seconds: null };
  if (!parts.every((part) => part === "" || INTEGER_PATTERN.test(part))) {
    return { error: "시간은 숫자로 적어 주세요.", seconds: null };
  }

  const [hours, minutes, seconds] = parts.map((part) => Number(part || 0));
  if (minutes > 59 || seconds > 59) return { error: "분과 초는 59까지 적을 수 있어요.", seconds: null };

  const total = hours * 3600 + minutes * 60 + seconds;
  if (!inRange(total, LIMITS.durationSeconds)) return { error: "시간은 1초부터 24시간까지예요.", seconds: null };

  return { error: null, seconds: total };
};

const parseDistanceMeters = (distanceKm: string) => {
  const trimmed = distanceKm.trim();
  if (trimmed === "") return { error: "거리를 적어 주세요.", meters: null };
  if (!DECIMAL_2_PATTERN.test(trimmed)) return { error: "거리는 소수 둘째 자리까지 적어 주세요.", meters: null };

  const meters = Math.round(Number(trimmed) * 1000);
  if (!inRange(meters, LIMITS.distanceMeters)) return { error: "거리는 0.01km부터 500km까지예요.", meters: null };

  return { error: null, meters };
};

const parseWeightKg = (weightKg: string) => {
  const trimmed = weightKg.trim();
  if (trimmed === "") return { error: null, weight: null };
  if (!DECIMAL_2_PATTERN.test(trimmed)) return { error: "무게는 소수 둘째 자리까지 적어 주세요.", weight: null };

  const weight = Number(trimmed);
  if (!inRange(weight, LIMITS.weightKg)) return { error: "무게는 1000kg까지 적을 수 있어요.", weight: null };

  return { error: null, weight };
};

const parseReps = (reps: string) => {
  const trimmed = reps.trim();
  if (trimmed === "") return { error: "횟수를 적어 주세요.", reps: null };
  if (!INTEGER_PATTERN.test(trimmed)) return { error: "횟수는 정수로 적어 주세요.", reps: null };

  const value = Number(trimmed);
  if (!inRange(value, LIMITS.reps)) return { error: "횟수는 1부터 1000까지예요.", reps: null };

  return { error: null, reps: value };
};

const validateBasics = (values: WorkoutFormValues, today: string, errors: WorkoutFormErrors) => {
  const dateError = getDateError(values.workoutDate, today);
  if (dateError) errors.workoutDate = dateError;
  if (!isWorkoutKind(values.kind)) errors.kind = "운동 종류를 골라 주세요.";
};

const validateDetail = (values: WorkoutFormValues, errors: WorkoutFormErrors) => {
  if (values.kind === "run") {
    const distance = parseDistanceMeters(values.run.distanceKm);
    if (distance.error) errors["run.distanceKm"] = distance.error;

    const duration = parseDuration(values.run.duration);
    if (duration.error) errors["run.duration"] = duration.error;
    else if (duration.seconds === null) errors["run.duration"] = "달린 시간을 적어 주세요.";
    return;
  }

  const duration = parseDuration(values.duration);
  if (duration.error) errors.duration = duration.error;
  // 기타는 시간 말고 적을 상세가 없어서 시간을 받는다. 헬스는 세트가 있으니 시간은 선택.
  else if (values.kind === "other" && duration.seconds === null) errors.duration = "운동한 시간을 적어 주세요.";

  if (values.kind !== "strength") return;

  if (values.exercises.length === 0) errors.exercises = "종목을 하나 이상 추가해 주세요.";
  if (values.exercises.length > MAX_EXERCISES) errors.exercises = `종목은 ${MAX_EXERCISES}개까지예요.`;

  for (const exercise of values.exercises) {
    const name = exercise.name.trim();
    if (name.length === 0) errors[`${exerciseErrorKey(exercise.key)}.name`] = "종목 이름을 적어 주세요.";
    else if (name.length > LIMITS.exerciseName) {
      errors[`${exerciseErrorKey(exercise.key)}.name`] = `종목 이름은 ${LIMITS.exerciseName}자까지예요.`;
    }

    if (exercise.sets.length === 0)
      errors[`${exerciseErrorKey(exercise.key)}.sets`] = "세트를 하나 이상 추가해 주세요.";
    if (exercise.sets.length > MAX_SETS_PER_EXERCISE) {
      errors[`${exerciseErrorKey(exercise.key)}.sets`] = `세트는 ${MAX_SETS_PER_EXERCISE}개까지예요.`;
    }

    for (const set of exercise.sets) {
      const weight = parseWeightKg(set.weightKg);
      if (weight.error) errors[setErrorKey(exercise.key, set.key, "weightKg")] = weight.error;

      const reps = parseReps(set.reps);
      if (reps.error) errors[setErrorKey(exercise.key, set.key, "reps")] = reps.error;
    }
  }
};

const validateFinish = (values: WorkoutFormValues, errors: WorkoutFormErrors) => {
  if (values.title.trim().length > LIMITS.title) errors.title = `제목은 ${LIMITS.title}자까지예요.`;
  if (values.placeName.trim().length > LIMITS.placeName) errors.placeName = `장소는 ${LIMITS.placeName}자까지예요.`;
  if (values.memo.trim().length > LIMITS.memo) errors.memo = `메모는 ${LIMITS.memo}자까지예요.`;
};

// 다음 단계로 넘어가기 전에 그 단계 입력만 확인한다.
export const validateWorkoutStep = (
  values: WorkoutFormValues,
  step: WorkoutFormStep,
  today = getTodayInSeoul(),
): WorkoutFormErrors => {
  const errors: WorkoutFormErrors = {};
  if (step === "basics") validateBasics(values, today, errors);
  if (step === "detail") validateDetail(values, errors);
  if (step === "finish") validateFinish(values, errors);
  return errors;
};

export type ToWorkoutInputResult =
  | { ok: true; input: WorkoutInput }
  | { ok: false; errors: WorkoutFormErrors; step: WorkoutFormStep };

// 저장 직전. 오류가 있으면 처음 걸린 단계로 돌려보낸다.
export const toWorkoutInput = (values: WorkoutFormValues, today = getTodayInSeoul()): ToWorkoutInputResult => {
  for (const step of WORKOUT_FORM_STEPS) {
    const errors = validateWorkoutStep(values, step, today);
    if (Object.keys(errors).length > 0) return { errors, ok: false, step };
  }

  const isRun = values.kind === "run";
  const runDistance = parseDistanceMeters(values.run.distanceKm).meters;
  const runDuration = parseDuration(values.run.duration).seconds;
  const exercises: StrengthExercise[] =
    values.kind === "strength"
      ? values.exercises.map((exercise) => ({
          name: exercise.name.trim(),
          sets: exercise.sets.map((set) => ({
            reps: parseReps(set.reps).reps as number,
            weightKg: parseWeightKg(set.weightKg).weight,
          })),
        }))
      : [];

  return {
    input: {
      ...(values.id ? { id: values.id } : {}),
      companionIds: values.crewId === null ? [] : [...new Set(values.companionIds)],
      crewId: values.crewId,
      // 러닝 시간은 run.durationSeconds에 둔다. 둘 다 채우면 save_workout이 거절한다.
      durationSeconds: isRun ? null : parseDuration(values.duration).seconds,
      exercises,
      kind: values.kind,
      memo: toNullableText(values.memo),
      placeName: toNullableText(values.placeName),
      run: isRun ? { distanceMeters: runDistance as number, durationSeconds: runDuration as number } : null,
      title: toNullableText(values.title),
      workoutDate: values.workoutDate,
    },
    ok: true,
  };
};
