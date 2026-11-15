import { saveWorkout } from "@/features/workout/api/workout-actions";
import { createWorkoutFormValues, getTodayInSeoul } from "@/features/workout/model/workout-form";
import { requireUser } from "@/shared/api/supabase/require-user";
import { WorkoutForm } from "@/widgets/workout-form";
import { getWorkoutFormCrews } from "@/widgets/workout-form/api/get-form-crews";

export async function NewWorkoutPage() {
  const { user } = await requireUser();
  const crews = await getWorkoutFormCrews(user.id);
  const today = getTodayInSeoul();

  return (
    <WorkoutForm
      title="기록하기"
      initialValues={createWorkoutFormValues(today)}
      crews={crews}
      today={today}
      closeHref="/workouts"
      saveWorkout={saveWorkout}
    />
  );
}
