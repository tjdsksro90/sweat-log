import { notFound } from "next/navigation";

import { getWorkoutDetail } from "@/entities/workout/api/server-queries";
import { deleteWorkout, saveWorkout } from "@/features/workout/api/workout-actions";
import { fromWorkoutDetail, getTodayInSeoul } from "@/features/workout/model/workout-form";
import { deleteWorkoutPhoto, uploadWorkoutPhoto } from "@/features/workout-photo/api/photo-actions";
import { requireUser } from "@/shared/api/supabase/require-user";
import { WorkoutForm } from "@/widgets/workout-form";
import { getWorkoutFormCrews } from "@/widgets/workout-form/api/get-form-crews";

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
      existingCompanions={detail.companions.map((companion) => ({
        userId: companion.id,
        nickname: companion.nickname,
      }))}
      today={getTodayInSeoul()}
      closeHref={`/workouts/${detail.id}`}
      saveWorkout={saveWorkout}
      deleteWorkout={deleteWorkout}
      initialPhotos={detail.photos}
      photoActions={{ upload: uploadWorkoutPhoto, remove: deleteWorkoutPhoto }}
    />
  );
}
