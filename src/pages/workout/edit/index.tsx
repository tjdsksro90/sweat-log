import { notFound } from "next/navigation";

import type { WorkoutDetail } from "@/entities/workout/model/contracts";
import { deleteWorkout, saveWorkout } from "@/features/workout/api/workout-actions";
import { fromWorkoutDetail, getTodayInSeoul } from "@/features/workout/model/workout-form";
import { requireUser } from "@/shared/api/supabase/require-user";
import { WorkoutForm } from "@/widgets/workout-form";
import { getWorkoutFormCrews } from "@/widgets/workout-form/api/get-form-crews";

// TODO(A #18 병합 후): entities/workout/api/server-queries의 getWorkoutDetail로 바꾼다.
const getWorkoutDetail = async (_workoutId: string): Promise<WorkoutDetail | null> => null;

export async function EditWorkoutPage({ workoutId }: { workoutId: string }) {
  const { user } = await requireUser();
  const [detail, crews] = await Promise.all([getWorkoutDetail(workoutId), getWorkoutFormCrews(user.id)]);

  // 남의 기록은 볼 수는 있어도 고칠 수 없다. 수정 화면 자체를 없는 것으로 본다.
  if (!detail || !detail.isMine) notFound();

  return (
    <WorkoutForm
      title="기록 수정"
      initialValues={fromWorkoutDetail(detail)}
      crews={crews}
      today={getTodayInSeoul()}
      closeHref={`/workouts/${detail.id}`}
      saveWorkout={saveWorkout}
      deleteWorkout={deleteWorkout}
    />
  );
}
