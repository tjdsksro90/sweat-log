/**
 * 작성·수정 폼의 상태. 입력 칸은 문자열을 그대로 들고 있다가 저장할 때만 숫자로 바꾼다(workout-input.ts).
 * 종류를 바꿔도 다른 종류의 입력은 지우지 않는다. 러닝을 적다가 헬스로 바꿨다 돌아와도 값이 남는다.
 */
import type { WorkoutDetail } from "@/entities/workout/model/contracts";
import { formatPace, getPaceSecondsPerKm } from "@/entities/workout/model/pace";
import type { WorkoutKind } from "@/entities/workout/model/types";

export const WORKOUT_FORM_STEPS = ["basics", "detail", "finish"] as const;

export type WorkoutFormStep = (typeof WORKOUT_FORM_STEPS)[number];

export const WORKOUT_FORM_STEP_LABELS: Record<WorkoutFormStep, string> = {
  basics: "언제·무엇",
  detail: "상세",
  finish: "마무리",
};

export type DurationFormValues = {
  hours: string;
  minutes: string;
  seconds: string;
};

export type RunFormValues = {
  distanceKm: string;
  duration: DurationFormValues;
};

// key는 목록 렌더링과 오류 위치를 가리키는 용도. 서버로 보내지 않는다.
export type StrengthSetFormValues = {
  key: string;
  weightKg: string; // 비우면 맨몸 운동
  reps: string;
};

export type StrengthExerciseFormValues = {
  key: string;
  name: string;
  sets: StrengthSetFormValues[];
};

export type WorkoutFormValues = {
  id: string | null;
  kind: WorkoutKind;
  workoutDate: string;
  run: RunFormValues;
  exercises: StrengthExerciseFormValues[];
  duration: DurationFormValues; // 헬스·기타의 전체 운동 시간
  title: string;
  placeName: string;
  memo: string;
  crewId: string | null;
  companionIds: string[];
};

export const MAX_EXERCISES = 20;
export const MAX_SETS_PER_EXERCISE = 30;

const createKey = () => crypto.randomUUID();

const EMPTY_DURATION: DurationFormValues = { hours: "", minutes: "", seconds: "" };

// 기록 날짜는 한국 시간 기준. 서버(UTC)에서 불러도 같은 날을 돌려준다.
export const getTodayInSeoul = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(now);

export const createEmptySet = (): StrengthSetFormValues => ({ key: createKey(), reps: "", weightKg: "" });

export const createEmptyExercise = (): StrengthExerciseFormValues => ({
  key: createKey(),
  name: "",
  sets: [createEmptySet()],
});

export const createWorkoutFormValues = (today = getTodayInSeoul(), kind: WorkoutKind = "run"): WorkoutFormValues => ({
  companionIds: [],
  crewId: null,
  duration: { ...EMPTY_DURATION },
  exercises: [createEmptyExercise()],
  id: null,
  kind,
  memo: "",
  placeName: "",
  run: { distanceKm: "", duration: { ...EMPTY_DURATION } },
  title: "",
  workoutDate: today,
});

const toDurationFormValues = (totalSeconds: number | null): DurationFormValues => {
  if (totalSeconds === null) return { ...EMPTY_DURATION };

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: hours > 0 ? String(hours) : "",
    minutes: String(minutes),
    seconds: String(seconds),
  };
};

// 거리는 m 정수로 저장하니 km 소수 둘째 자리 밖의 값은 생기지 않는다. 끝의 0은 지운다(5.20 → 5.2).
const toDistanceKm = (distanceMeters: number) => String(Number((distanceMeters / 1000).toFixed(2)));

// 수정 화면의 초기값
export const fromWorkoutDetail = (detail: WorkoutDetail): WorkoutFormValues => {
  const empty = createWorkoutFormValues(detail.workoutDate);

  return {
    ...empty,
    companionIds: detail.companions.map((companion) => companion.id),
    crewId: detail.crew?.id ?? null,
    duration: toDurationFormValues(detail.durationSeconds),
    exercises:
      detail.exercises.length > 0
        ? detail.exercises.map((exercise) => ({
            key: createKey(),
            name: exercise.name,
            sets: exercise.sets.map((set) => ({
              key: createKey(),
              reps: String(set.reps),
              weightKg: set.weightKg === null ? "" : String(set.weightKg),
            })),
          }))
        : empty.exercises,
    id: detail.id,
    kind: detail.kind,
    memo: detail.memo ?? "",
    placeName: detail.placeName ?? "",
    run: detail.run
      ? {
          distanceKm: toDistanceKm(detail.run.distanceMeters),
          duration: toDurationFormValues(detail.run.durationSeconds),
        }
      : empty.run,
    title: detail.title ?? "",
  };
};

const updateExercise = (
  values: WorkoutFormValues,
  exerciseKey: string,
  update: (exercise: StrengthExerciseFormValues) => StrengthExerciseFormValues,
): WorkoutFormValues => ({
  ...values,
  exercises: values.exercises.map((exercise) => (exercise.key === exerciseKey ? update(exercise) : exercise)),
});

export const addExercise = (values: WorkoutFormValues): WorkoutFormValues => {
  if (values.exercises.length >= MAX_EXERCISES) return values;
  return { ...values, exercises: [...values.exercises, createEmptyExercise()] };
};

// 마지막 종목을 지우면 빈 종목 하나를 남긴다. 헬스 기록에는 종목이 하나 이상 있어야 한다.
export const removeExercise = (values: WorkoutFormValues, exerciseKey: string): WorkoutFormValues => {
  const exercises = values.exercises.filter((exercise) => exercise.key !== exerciseKey);
  return { ...values, exercises: exercises.length > 0 ? exercises : [createEmptyExercise()] };
};

export const renameExercise = (values: WorkoutFormValues, exerciseKey: string, name: string) =>
  updateExercise(values, exerciseKey, (exercise) => ({ ...exercise, name }));

// 보통 같은 무게·횟수로 세트를 이어 가니, 직전 세트 값을 복사해서 새 세트를 채운다.
export const addSet = (values: WorkoutFormValues, exerciseKey: string) =>
  updateExercise(values, exerciseKey, (exercise) => {
    if (exercise.sets.length >= MAX_SETS_PER_EXERCISE) return exercise;

    const previous = exercise.sets.at(-1);
    const next = previous ? { ...previous, key: createKey() } : createEmptySet();
    return { ...exercise, sets: [...exercise.sets, next] };
  });

export const removeSet = (values: WorkoutFormValues, exerciseKey: string, setKey: string) =>
  updateExercise(values, exerciseKey, (exercise) => {
    const sets = exercise.sets.filter((set) => set.key !== setKey);
    return { ...exercise, sets: sets.length > 0 ? sets : [createEmptySet()] };
  });

export const updateSet = (
  values: WorkoutFormValues,
  exerciseKey: string,
  setKey: string,
  patch: Partial<Pick<StrengthSetFormValues, "reps" | "weightKg">>,
) =>
  updateExercise(values, exerciseKey, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => (set.key === setKey ? { ...set, ...patch } : set)),
  }));

/**
 * 함께한 친구는 공유할 크루의 구성원 중에서 고른다. 크루를 바꾸면 새 크루에 없는 친구는 뺀다.
 * memberIds는 새 크루의 구성원 id. 크루를 비우면 함께한 친구도 모두 빠진다.
 */
export const changeCrew = (values: WorkoutFormValues, crewId: string | null, memberIds: string[] = []) => {
  const members = new Set(memberIds);
  return {
    ...values,
    companionIds: crewId === null ? [] : values.companionIds.filter((id) => members.has(id)),
    crewId,
  };
};

export const toggleCompanion = (values: WorkoutFormValues, userId: string): WorkoutFormValues => ({
  ...values,
  companionIds: values.companionIds.includes(userId)
    ? values.companionIds.filter((id) => id !== userId)
    : [...values.companionIds, userId],
});

// 처음 값과 달라졌으면 이탈할 때 확인한다. key는 새로 만들 때마다 바뀌므로 비교에서 뺀다.
const toComparable = (values: WorkoutFormValues) =>
  JSON.stringify({
    ...values,
    exercises: values.exercises.map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets.map((set) => [set.weightKg, set.reps]),
    })),
  });

export const isWorkoutFormDirty = (initial: WorkoutFormValues, current: WorkoutFormValues) =>
  toComparable(initial) !== toComparable(current);

/**
 * 러닝 입력 중 바로 보여주는 페이스. 아직 다 적지 않았거나 형식이 틀리면 "-".
 * 검증 규칙은 workout-input.ts와 같지만, 여기서는 오류 문구 없이 계산 가능한지만 본다.
 */
export const getRunPacePreview = (run: RunFormValues) => {
  const distanceKm = Number(run.distanceKm);
  const hours = Number(run.duration.hours || 0);
  const minutes = Number(run.duration.minutes || 0);
  const seconds = Number(run.duration.seconds || 0);

  if (![distanceKm, hours, minutes, seconds].every(Number.isFinite)) return formatPace(null);

  return formatPace(getPaceSecondsPerKm(Math.round(distanceKm * 1000), hours * 3600 + minutes * 60 + seconds));
};
