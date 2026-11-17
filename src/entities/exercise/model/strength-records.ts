export const STRENGTH_RECORD_LIMIT = 5;
export type StrengthRecord = {
  exerciseName: string;
  maxWeightKg: number | null;
  workoutDate: string;
  workoutId: string;
  workoutCount: number;
};

export type StrengthRecordWorkout = {
  workoutId: string;
  workoutDate: string;
  createdAt: string;
  sets: { name: string; weightKg: number | null }[];
};
