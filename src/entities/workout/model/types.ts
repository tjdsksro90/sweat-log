// DB는 check 제약으로 값을 막아서 생성 타입에서는 string이 된다. 앱에서는 이 타입으로 좁혀 쓴다.
export const WORKOUT_KINDS = ["run", "strength", "other"] as const;

export type WorkoutKind = (typeof WORKOUT_KINDS)[number];

export const WORKOUT_KIND_LABELS: Record<WorkoutKind, string> = {
  other: "기타",
  run: "러닝",
  strength: "헬스",
};

export const isWorkoutKind = (value: string): value is WorkoutKind =>
  (WORKOUT_KINDS as readonly string[]).includes(value);
