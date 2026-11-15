import type { WorkoutListItem } from "@/entities/workout/model/contracts";

export type WorkoutDateGroup = {
  date: string;
  workouts: WorkoutListItem[];
};

export const groupWorkoutsByDate = (workouts: readonly WorkoutListItem[]): WorkoutDateGroup[] => {
  const groups = new Map<string, WorkoutListItem[]>();
  for (const workout of workouts) {
    const items = groups.get(workout.workoutDate) ?? [];
    items.push(workout);
    groups.set(workout.workoutDate, items);
  }
  return Array.from(groups, ([date, items]) => ({ date, workouts: items })).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
};
