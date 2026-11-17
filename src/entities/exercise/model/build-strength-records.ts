import { normalizeExerciseName } from "./search-exercises";
import { STRENGTH_RECORD_LIMIT, type StrengthRecord, type StrengthRecordWorkout } from "./strength-records";

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * 데모 전용 집계. 실제 앱에서는 get_strength_records가 RLS 아래에서 전체 행을 집계한다.
 * 입력은 이미 내 작성·동행 헬스로 걸러진 목록이다. SQL과 정규화·동점·빈 무게 규칙을 맞춘다.
 */
export const buildStrengthRecords = (
  workouts: StrengthRecordWorkout[],
  today: string,
  limit = STRENGTH_RECORD_LIMIT,
): StrengthRecord[] => {
  const grouped = new Map<string, { record: StrengthRecord; createdAt: string; workouts: Set<string> }>();
  for (const workout of workouts) {
    if (workout.workoutDate > today) continue;
    for (const set of workout.sets) {
      const name = normalizeExerciseName(set.name);
      if (
        !name ||
        (set.weightKg !== null && (!Number.isFinite(set.weightKg) || set.weightKg < 0 || set.weightKg > 1000))
      )
        continue;
      const existing = grouped.get(name);
      const wins =
        !existing ||
        (set.weightKg ?? -1) > (existing.record.maxWeightKg ?? -1) ||
        (set.weightKg === existing.record.maxWeightKg &&
          (compareText(workout.workoutDate, existing.record.workoutDate) ||
            compareText(workout.createdAt, existing.createdAt) ||
            compareText(workout.workoutId, existing.record.workoutId)) < 0);
      const ids = existing?.workouts ?? new Set<string>();
      ids.add(workout.workoutId);
      if (wins)
        grouped.set(name, {
          workouts: ids,
          createdAt: workout.createdAt,
          record: {
            exerciseName: name,
            maxWeightKg: set.weightKg,
            workoutId: workout.workoutId,
            workoutDate: workout.workoutDate,
            workoutCount: 0,
          },
        });
    }
  }
  return Array.from(grouped.values(), ({ record, workouts }) => ({ ...record, workoutCount: workouts.size }))
    .sort((a, b) => b.workoutCount - a.workoutCount || compareText(a.exerciseName, b.exerciseName))
    .slice(0, Math.min(Math.max(Math.trunc(limit), 1), 20));
};
