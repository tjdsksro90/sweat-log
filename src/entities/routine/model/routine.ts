/**
 * 헬스 루틴: 자주 하는 헬스 구성(종목 순서, 종목별 세트의 무게 × 횟수)에 이름을 붙여 둔 것.
 * DB는 workout_routines 한 행에 구성 전체를 jsonb(exercises)로 둔다(supabase/migrations/…_workout_routines.sql).
 * 불러오기는 폼에 값을 복사하는 것이라, 루틴을 고치거나 지워도 이미 저장한 기록은 바뀌지 않는다.
 */
import type { Json } from "@/shared/api/supabase/database.types";

export type RoutineSet = {
  weightKg: number | null; // null이면 맨몸
  reps: number;
};

export type RoutineExercise = {
  name: string;
  sets: RoutineSet[];
};

export type Routine = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  updatedAt: string;
};

// 만들기(id 없음)와 수정(id 있음)에 함께 쓴다.
export type RoutineInput = {
  id?: string;
  name: string;
  exercises: RoutineExercise[];
};

// DB check 제약과 같은 값. 종목·세트 수 상한은 작성 폼과 같다(MAX_EXERCISES, MAX_SETS_PER_EXERCISE).
export const ROUTINE_LIMITS = {
  name: 40,
  perUser: 30,
} as const;

export type RoutineRow = {
  id: string;
  name: string;
  exercises: Json;
  updated_at: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// check 제약이 모양을 보장하지만, 읽을 때도 모르는 값은 빼고 쓴다. 화면이 깨지는 것보다 낫다.
const toRoutineExercises = (value: Json): RoutineExercise[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((exercise) => {
    if (!isRecord(exercise) || typeof exercise.name !== "string" || !Array.isArray(exercise.sets)) return [];
    const sets = exercise.sets.flatMap((set) =>
      isRecord(set) && typeof set.reps === "number" && (set.weight_kg === null || typeof set.weight_kg === "number")
        ? [{ reps: set.reps, weightKg: set.weight_kg }]
        : [],
    );
    return sets.length > 0 ? [{ name: exercise.name, sets }] : [];
  });
};

export const toRoutine = (row: RoutineRow): Routine => ({
  exercises: toRoutineExercises(row.exercises),
  id: row.id,
  name: row.name,
  updatedAt: row.updated_at,
});

// DB 쪽 jsonb는 save_workout 입력처럼 snake_case(weight_kg)로 둔다.
export const toRoutineExercisesJson = (exercises: RoutineExercise[]): NonNullable<Json> =>
  exercises.map((exercise) => ({
    name: exercise.name,
    sets: exercise.sets.map((set) => ({ reps: set.reps, weight_kg: set.weightKg })),
  }));

export const countRoutineSets = (routine: Pick<Routine, "exercises">) =>
  routine.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);

// 목록·불러오기에서 루틴을 한 줄로 설명한다. 예: "종목 2개 · 세트 5개 · 스쿼트, 푸시업"
export const describeRoutine = (routine: Pick<Routine, "exercises">) => {
  const names = routine.exercises.map((exercise) => exercise.name).join(", ");
  return [`종목 ${routine.exercises.length}개`, `세트 ${countRoutineSets(routine)}개`, names]
    .filter(Boolean)
    .join(" · ");
};
