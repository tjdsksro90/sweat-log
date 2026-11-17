/**
 * 헬스 루틴 편집 폼과 불러오기.
 * 종목·세트 입력은 기록 작성 폼과 같은 값(StrengthExerciseFormValues)·편집 함수·검증을 쓴다.
 * 그래서 루틴에서 불러온 값은 기록 폼에서 평소처럼 고칠 수 있다.
 */
import { ROUTINE_LIMITS, type RoutineExercise, type RoutineInput } from "@/entities/routine/model/routine";

import { isUuid, parseExercises } from "./save-workout-input";
import {
  createEmptyExercise,
  MAX_EXERCISES,
  type StrengthExerciseFormValues,
  toExerciseFormValues,
} from "./workout-form";
import { toStrengthExercises, validateStrengthExercises, type WorkoutFormErrors } from "./workout-input";

/**
 * 루틴 이름 길이는 DB char_length와 같은 코드 포인트 단위로 센다. JS length(UTF-16)는 이모지를 2로 세서
 * 40자 이름을 거절하거나, 자를 때 이모지 반쪽(서로게이트)을 남긴다.
 */
const codePoints = (value: string) => Array.from(value);
const routineNameLength = (name: string) => codePoints(name).length;

export type RoutineFormValues = {
  id: string | null;
  name: string;
  exercises: StrengthExerciseFormValues[];
};

// 새 루틴. "이 구성으로 루틴 만들기"는 기록의 종목을, 그 밖에는 빈 종목 하나로 시작한다.
export const createRoutineFormValues = (
  source: { id?: string; name?: string; exercises?: RoutineExercise[] } = {},
): RoutineFormValues => ({
  exercises:
    source.exercises && source.exercises.length > 0
      ? toExerciseFormValues(source.exercises.slice(0, MAX_EXERCISES))
      : [createEmptyExercise()],
  id: source.id ?? null,
  // 기록 제목은 50자까지라 루틴 이름(40자)보다 길 수 있다.
  name: codePoints((source.name ?? "").trim())
    .slice(0, ROUTINE_LIMITS.name)
    .join("")
    .trim(),
});

// 처음 값과 달라졌으면 이탈할 때 확인한다. key는 새로 만들 때마다 바뀌므로 비교에서 뺀다.
const toComparable = (values: RoutineFormValues) =>
  JSON.stringify([
    values.name,
    values.exercises.map((exercise) => [exercise.name, exercise.sets.map((set) => [set.weightKg, set.reps])]),
  ]);

export const isRoutineFormDirty = (initial: RoutineFormValues, current: RoutineFormValues) =>
  toComparable(initial) !== toComparable(current);

export const validateRoutineForm = (values: RoutineFormValues): WorkoutFormErrors => {
  const errors: WorkoutFormErrors = {};
  const name = values.name.trim();
  if (name.length === 0) errors.name = "루틴 이름을 적어 주세요.";
  else if (routineNameLength(name) > ROUTINE_LIMITS.name) errors.name = `루틴 이름은 ${ROUTINE_LIMITS.name}자까지예요.`;

  validateStrengthExercises(values.exercises, errors);
  return errors;
};

export type ToRoutineInputResult = { ok: true; input: RoutineInput } | { ok: false; errors: WorkoutFormErrors };

export const toRoutineInput = (values: RoutineFormValues): ToRoutineInputResult => {
  const errors = validateRoutineForm(values);
  if (Object.keys(errors).length > 0) return { errors, ok: false };

  return {
    input: {
      ...(values.id ? { id: values.id } : {}),
      exercises: toStrengthExercises(values.exercises),
      name: values.name.trim(),
    },
    ok: true,
  };
};

const INVALID_INPUT = "입력한 값을 다시 확인해 주세요.";

export type ParseRoutineInputResult = { ok: true; input: RoutineInput } | { ok: false; error: string };

// Server Action 인자는 누구나 보낼 수 있으니 한 번 더 좁힌다. 범위는 기록의 헬스 세트와 같은 규칙이다.
export const parseRoutineInput = (value: unknown): ParseRoutineInputResult => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { error: INVALID_INPUT, ok: false };

  const { id, name, exercises } = value as Record<string, unknown>;
  if (id !== undefined && !isUuid(id)) return { error: INVALID_INPUT, ok: false };
  if (typeof name !== "string") return { error: "루틴 이름을 적어 주세요.", ok: false };

  const trimmed = name.trim();
  if (trimmed.length === 0) return { error: "루틴 이름을 적어 주세요.", ok: false };
  if (routineNameLength(trimmed) > ROUTINE_LIMITS.name) {
    return { error: `루틴 이름은 ${ROUTINE_LIMITS.name}자까지예요.`, ok: false };
  }

  const parsed = parseExercises(exercises);
  if (parsed === null || parsed.length === 0) return { error: INVALID_INPUT, ok: false };

  return { input: { ...(id !== undefined ? { id } : {}), exercises: parsed, name: trimmed }, ok: true };
};

type RoutineError = { message: string; code?: string } | null | undefined;

// 23514(check 제약 위반)는 길이·범위 초과, too_many_routines는 개수 상한 트리거.
export const getRoutineErrorMessage = (error: RoutineError) => {
  if (error?.message === "too_many_routines") {
    return `루틴은 ${ROUTINE_LIMITS.perUser}개까지 저장할 수 있어요. 안 쓰는 루틴을 지우고 다시 시도해 주세요.`;
  }
  if (error?.message === "routine_not_found") return "루틴을 찾지 못했어요. 이미 지웠는지 확인해 주세요.";
  if (error?.code === "23514") return INVALID_INPUT;
  return "루틴을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
};

// ---------------------------------------------------------------------------
// 기록 작성 폼에서 불러오기
// ---------------------------------------------------------------------------

export type RoutineLoadMode = "replace" | "append";

const hasInput = (exercise: StrengthExerciseFormValues) =>
  exercise.name.trim() !== "" || exercise.sets.some((set) => set.weightKg.trim() !== "" || set.reps.trim() !== "");

// 이미 적은 종목이 있으면 덮어쓸지 뒤에 붙일지 묻는다. 처음 놓인 빈 종목만 있으면 묻지 않고 채운다.
export const hasEnteredExercises = (exercises: StrengthExerciseFormValues[]) => exercises.some(hasInput);

// 뒤에 붙였을 때 종목 수. 빈 종목 칸은 버리고 센다.
const countAfterAppend = (current: StrengthExerciseFormValues[], routine: RoutineExercise[]) =>
  current.filter(hasInput).length + routine.length;

export const canAppendRoutine = (current: StrengthExerciseFormValues[], routine: RoutineExercise[]) =>
  countAfterAppend(current, routine) <= MAX_EXERCISES;

/**
 * 루틴의 종목을 폼 값으로 복사한다. 복사본이라 불러온 뒤 고쳐도 루틴은 그대로다.
 * - replace: 지금 적은 종목을 모두 루틴 구성으로 바꾼다.
 * - append: 적은 종목 뒤에 붙인다. 아무것도 안 적은 빈 종목 칸은 버린다. 종목 상한(20)을 넘으면 넘는 만큼 붙이지 않는다.
 */
export const loadRoutineExercises = (
  current: StrengthExerciseFormValues[],
  routine: RoutineExercise[],
  mode: RoutineLoadMode,
): StrengthExerciseFormValues[] => {
  const loaded = toExerciseFormValues(routine);
  const next = mode === "replace" ? loaded : [...current.filter(hasInput), ...loaded];
  const capped = next.slice(0, MAX_EXERCISES);
  return capped.length > 0 ? capped : [createEmptyExercise()];
};
