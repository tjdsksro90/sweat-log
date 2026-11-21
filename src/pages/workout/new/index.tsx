import { getMyRoutinesForForm } from "@/entities/routine/api/server-queries";
import { getRecentStrengthWorkoutsForForm } from "@/entities/workout/api/server-queries";
import { isWorkoutKind } from "@/entities/workout/model/types";
import { updateRoutineExercises } from "@/features/workout/api/routine-actions";
import { saveWorkout } from "@/features/workout/api/workout-actions";
import { createWorkoutFormValues, getTodayInSeoul } from "@/features/workout/model/workout-form";
import { deleteWorkoutPhoto, uploadWorkoutPhoto } from "@/features/workout-photo/api/photo-actions";
import { requireUser } from "@/shared/api/supabase/require-user";
import { WorkoutForm } from "@/widgets/workout-form";
import { getWorkoutFormCrews } from "@/widgets/workout-form/api/get-form-crews";

type SearchParams = Record<string, string | string[] | undefined>;

// 목록에서 고른 종류(?kind=strength)를 처음 선택값으로 쓴다. 모르는 값이면 기본값(러닝)으로 둔다.
export async function NewWorkoutPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { kind } = await searchParams;
  const { user } = await requireUser();
  const today = getTodayInSeoul();
  const [crews, routines, recentWorkouts] = await Promise.all([
    getWorkoutFormCrews(user.id),
    getMyRoutinesForForm(),
    getRecentStrengthWorkoutsForForm({ today }),
  ]);

  return (
    <WorkoutForm
      title="기록하기"
      initialValues={createWorkoutFormValues(today, typeof kind === "string" && isWorkoutKind(kind) ? kind : undefined)}
      crews={crews}
      today={today}
      closeHref="/workouts"
      saveWorkout={saveWorkout}
      photoActions={{ upload: uploadWorkoutPhoto, remove: deleteWorkoutPhoto }}
      routines={routines}
      recentWorkouts={recentWorkouts}
      updateRoutine={updateRoutineExercises}
    />
  );
}
