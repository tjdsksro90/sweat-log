/**
 * 내 종목: 사전(EXERCISES)에 없는 운동을 사람마다 부위와 함께 등록해 둔 것.
 * DB는 user_exercises(supabase/migrations/…_user_exercises.sql). 본인만 보고, 크루와 공유하지 않는다.
 * 기록(strength_sets)은 이름을 복사해 둔 그날의 스냅숏이라, 내 종목을 고치거나 지워도 지난 기록은 그대로다.
 */
import { EXERCISE_BODY_PARTS, type ExerciseBodyPart } from "./exercises";
import { type ExerciseOption, findExercise, normalizeExerciseName } from "./search-exercises";

export type UserExercise = {
  id: string;
  name: string;
  bodyPart: ExerciseBodyPart;
  bodyweight: boolean;
};

// 만들기(id 없음)와 수정(id 있음)에 함께 쓴다. 부위는 고르기 전이면 null이다.
export type UserExerciseInput = {
  id?: string;
  name: string;
  bodyPart: ExerciseBodyPart | null;
  bodyweight: boolean;
};

export type ParsedUserExerciseInput = Omit<UserExerciseInput, "bodyPart"> & { bodyPart: ExerciseBodyPart };

// DB check 제약·상한 트리거와 같은 값
export const USER_EXERCISE_LIMITS = {
  name: 50,
  perUser: 100,
} as const;

/**
 * 저장 결과. 공백을 뺀 이름이 사전이나 내 다른 종목과 같으면 duplicate에 그 종목을 담아,
 * 새로 만들지 않고 그 종목을 고르게 안내한다.
 */
export type SaveUserExerciseResult =
  | { ok: true; exercise: UserExercise }
  | { ok: false; error: string; duplicate?: ExerciseOption };
export type DeleteUserExerciseResult = { ok: true } | { ok: false; error: string };

export type UserExerciseRow = {
  id: string;
  name: string;
  body_part: string;
  bodyweight: boolean;
};

export const isExerciseBodyPart = (value: unknown): value is ExerciseBodyPart =>
  typeof value === "string" && (EXERCISE_BODY_PARTS as readonly string[]).includes(value);

// check 제약이 부위를 보장하지만, 모르는 값이 오면 그 행만 뺀다. 화면이 깨지는 것보다 낫다.
export const toUserExercises = (rows: UserExerciseRow[]): UserExercise[] =>
  rows.flatMap((row) =>
    isExerciseBodyPart(row.body_part)
      ? [{ bodyPart: row.body_part, bodyweight: row.bodyweight, id: row.id, name: row.name }]
      : [],
  );

// 목록은 이름순(한국어)으로 보여 준다.
export const sortUserExercises = (exercises: UserExercise[]) =>
  [...exercises].sort((left, right) => left.name.localeCompare(right.name, "ko") || (left.id < right.id ? -1 : 1));

/**
 * 공백을 뺀 이름이 같은 종목. 사전을 먼저 보고, 다음으로 내 다른 종목을 본다.
 * 고치는 중인 종목(excludeId)은 빼서, 띄어쓰기만 바꾸는 수정은 막지 않는다.
 */
export const findDuplicateExercise = (
  name: string,
  userExercises: readonly UserExercise[],
  excludeId?: string,
): ExerciseOption | undefined =>
  findExercise(
    name,
    userExercises.filter((exercise) => exercise.id !== excludeId),
  );

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUserExerciseId = (value: unknown): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

const INVALID_NAME = `종목 이름을 1~${USER_EXERCISE_LIMITS.name}자로 적어 주세요.`;

export const parseUserExerciseInput = (
  input: UserExerciseInput,
): { ok: true; input: ParsedUserExerciseInput } | { ok: false; error: string } => {
  // Server Action 인자는 브라우저가 보낸 값이라 타입을 믿지 않는다. 모양이 틀리면 500 대신 안내 문구를 돌려준다.
  if (typeof input !== "object" || input === null || typeof input.name !== "string") {
    return { error: INVALID_NAME, ok: false };
  }
  const name = input.name.trim();
  if (normalizeExerciseName(name).length === 0 || Array.from(name).length > USER_EXERCISE_LIMITS.name) {
    return { error: INVALID_NAME, ok: false };
  }
  if (!isExerciseBodyPart(input.bodyPart)) return { error: "부위를 골라 주세요.", ok: false };
  if (typeof input.bodyweight !== "boolean") return { error: "맨몸 운동인지 다시 확인해 주세요.", ok: false };
  if (input.id !== undefined && !isUserExerciseId(input.id)) {
    return { error: "종목을 찾지 못했어요. 이미 지웠는지 확인해 주세요.", ok: false };
  }
  return { input: { bodyPart: input.bodyPart, bodyweight: input.bodyweight, id: input.id, name }, ok: true };
};

export const describeDuplicate = (duplicate: ExerciseOption) =>
  duplicate.userExerciseId
    ? `‘${duplicate.name}’이(가) 이미 내 종목에 있어요.`
    : `‘${duplicate.name}’은(는) 기본 종목에 있어요.`;

type UserExerciseError = { code?: string; message?: string } | null | undefined;

export const getUserExerciseErrorMessage = (error: UserExerciseError) => {
  if (error?.message === "too_many_exercises") {
    return `내 종목은 ${USER_EXERCISE_LIMITS.perUser}개까지 등록할 수 있어요. 안 쓰는 종목을 지우고 다시 시도해 주세요.`;
  }
  if (error?.message === "exercise_not_found") return "종목을 찾지 못했어요. 이미 지웠는지 확인해 주세요.";
  if (error?.code === "23505") return "같은 이름의 종목이 이미 있어요. 목록을 새로 고쳐 확인해 주세요.";
  if (error?.code === "23514") return INVALID_NAME;
  return "종목을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
};

/**
 * 내 헬스 기록에 쓴 이름 가운데 사전·내 종목에 없는 것. 설정의 "기록에만 있는 종목"에서 부위만 골라 바로 등록한다.
 * names는 공백을 뺀 이름으로 이미 묶여 있다(get_my_exercise_names, 체험은 같은 규칙의 JS).
 */
export type RecordedExerciseName = { name: string; workoutCount: number };

export const findRecordOnlyExercises = (
  names: readonly RecordedExerciseName[],
  userExercises: readonly UserExercise[],
): RecordedExerciseName[] => names.filter(({ name }) => !findExercise(name, userExercises));
