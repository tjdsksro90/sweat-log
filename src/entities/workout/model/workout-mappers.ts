/**
 * DB 행 ↔ 계약 타입(contracts.ts) 변환. 조회 함수(api/server-queries.ts)와 저장 Server Action이 쓴다.
 * 행 타입은 server-queries.ts의 select 문자열이 돌려주는 모양이다. select를 바꾸면 여기도 같이 바꾼다.
 */
import type { StrengthExercise, WorkoutDetail, WorkoutInput, WorkoutListItem, WorkoutPerson } from "./contracts";
import { isWorkoutKind, type WorkoutKind } from "./types";

export type WorkoutPersonRow = { id: string; nickname: string };

export type StrengthSetRow = {
  exercise_name: string;
  exercise_order: number;
  set_order: number;
  weight_kg: number | null;
  reps: number;
};

export type WorkoutListRow = {
  id: string;
  kind: string;
  workout_date: string;
  title: string | null;
  place_name: string | null;
  duration_seconds: number | null;
  created_at: string;
  user_id: string;
  author: WorkoutPersonRow | null;
  crew: { id: string; name: string } | null;
  companions: { user_id: string; profile: WorkoutPersonRow | null }[];
  run: { distance_meters: number; duration_seconds: number } | null;
  sets: StrengthSetRow[];
  comments: { count: number }[];
};

export type WorkoutDetailRow = WorkoutListRow & { memo: string | null };

// 크루를 나간 작성자처럼 프로필을 볼 수 없는 경우
const UNKNOWN_NICKNAME = "알 수 없음";

// save_workout RPC의 p_input. 키 이름은 supabase/migrations의 save_workout 주석과 같다.
export type SaveWorkoutPayload = {
  id: string | null;
  kind: WorkoutKind;
  workout_date: string;
  title: string | null;
  memo: string | null;
  place_name: string | null;
  crew_id: string | null;
  companion_ids: string[];
  duration_seconds: number | null;
  run: { distance_meters: number; duration_seconds: number } | null;
  exercises: { name: string; sets: { weight_kg: number | null; reps: number }[] }[];
};

export const toSaveWorkoutPayload = (input: WorkoutInput): SaveWorkoutPayload => ({
  id: input.id ?? null,
  kind: input.kind,
  workout_date: input.workoutDate,
  title: input.title,
  memo: input.memo,
  place_name: input.placeName,
  crew_id: input.crewId,
  companion_ids: input.companionIds,
  duration_seconds: input.durationSeconds,
  run: input.run ? { distance_meters: input.run.distanceMeters, duration_seconds: input.run.durationSeconds } : null,
  exercises: input.exercises.map((exercise) => ({
    name: exercise.name,
    sets: exercise.sets.map((set) => ({ weight_kg: set.weightKg, reps: set.reps })),
  })),
});

const toKind = (kind: string): WorkoutKind => {
  if (!isWorkoutKind(kind)) {
    throw new Error(`알 수 없는 운동 종류: ${kind}`);
  }

  return kind;
};

const toPerson = (row: WorkoutPersonRow | null, fallbackId: string): WorkoutPerson =>
  row ? { id: row.id, nickname: row.nickname } : { id: fallbackId, nickname: UNKNOWN_NICKNAME };

const sortSets = (sets: StrengthSetRow[]) =>
  [...sets].sort((a, b) => a.exercise_order - b.exercise_order || a.set_order - b.set_order);

// 소수 둘째 자리까지. 70.5kg × 3 같은 값이 부동소수 오차로 211.49999…가 되지 않게 한다.
const roundKg = (value: number) => Math.round(value * 100) / 100;

export const getSetVolumeKg = (set: { weight_kg: number | null; reps: number }) => (set.weight_kg ?? 0) * set.reps;

export const toExercises = (sets: StrengthSetRow[]): StrengthExercise[] => {
  const exercises: StrengthExercise[] = [];
  let currentOrder: number | null = null;

  for (const set of sortSets(sets)) {
    if (set.exercise_order !== currentOrder) {
      exercises.push({ name: set.exercise_name, sets: [] });
      currentOrder = set.exercise_order;
    }

    exercises[exercises.length - 1].sets.push({ weightKg: set.weight_kg, reps: set.reps });
  }

  return exercises;
};

export const toStrengthSummary = (sets: StrengthSetRow[]) => ({
  exerciseCount: new Set(sets.map((set) => set.exercise_order)).size,
  setCount: sets.length,
  totalVolumeKg: roundKg(sets.reduce((total, set) => total + getSetVolumeKg(set), 0)),
});

// 작성자의 다른 크루 친구라서 내가 프로필을 볼 수 없는 동행자는 뺀다.
// 다만 작성자 본인에게는 남긴다. 크루를 나간 동행자도 수정 화면에서 그대로 두거나 뺄 수 있어야 해서다.
const toCompanions = (companions: WorkoutListRow["companions"], keepHidden: boolean) =>
  companions.flatMap(({ user_id, profile }) => (profile || keepHidden ? [toPerson(profile, user_id)] : []));

const toCommonFields = (row: WorkoutListRow, viewerId?: string) => {
  const kind = toKind(row.kind);

  return {
    id: row.id,
    kind,
    workoutDate: row.workout_date,
    title: row.title,
    placeName: row.place_name,
    author: toPerson(row.author, row.user_id),
    companions: toCompanions(row.companions, row.user_id === viewerId),
    crew: row.crew ? { id: row.crew.id, name: row.crew.name } : null,
    run:
      kind === "run" && row.run
        ? { distanceMeters: row.run.distance_meters, durationSeconds: row.run.duration_seconds }
        : null,
    durationSeconds: row.duration_seconds,
    commentCount: row.comments[0]?.count ?? 0,
  };
};

export const toWorkoutListItem = (row: WorkoutListRow): WorkoutListItem => {
  const common = toCommonFields(row);

  return {
    ...common,
    strengthSummary: common.kind === "strength" ? toStrengthSummary(row.sets) : null,
  };
};

export const toWorkoutDetail = (row: WorkoutDetailRow, viewerId: string): WorkoutDetail => {
  const common = toCommonFields(row, viewerId);

  return {
    ...common,
    memo: row.memo,
    exercises: common.kind === "strength" ? toExercises(row.sets) : [],
    isMine: row.user_id === viewerId,
    createdAt: row.created_at,
  };
};
