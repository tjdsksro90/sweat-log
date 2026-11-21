import { notFound } from "next/navigation";

import { getMyRoutinesForForm } from "@/entities/routine/api/server-queries";
import { getRecentStrengthWorkoutsForForm, getWorkoutDetail } from "@/entities/workout/api/server-queries";
import { updateRoutineExercises } from "@/features/workout/api/routine-actions";
import { deleteWorkout, saveWorkout } from "@/features/workout/api/workout-actions";
import { fromWorkoutDetail, getTodayInSeoul } from "@/features/workout/model/workout-form";
import { deleteWorkoutPhoto, uploadWorkoutPhoto } from "@/features/workout-photo/api/photo-actions";
import { requireUser } from "@/shared/api/supabase/require-user";
import { WorkoutForm } from "@/widgets/workout-form";
import { getWorkoutFormCrews } from "@/widgets/workout-form/api/get-form-crews";

export async function EditWorkoutPage({ workoutId }: { workoutId: string }) {
  const { user } = await requireUser();
  const today = getTodayInSeoul();
  /**
   * 최근 기록은 헬스 기록을 고칠 때만 읽는다. 종류는 상세를 읽어야 알 수 있어 상세 뒤에 잇되,
   * 크루·루틴 조회와는 함께 돈다. 러닝·기타를 헬스로 바꿔 고칠 때는 최근 기록 불러오기를 보여 주지 않는다.
   * 지금 고치는 기록 자신은 불러올 목록에서 뺀다.
   */
  const detailPromise = getWorkoutDetail(workoutId);
  const recentPromise = detailPromise.then((detail) =>
    detail?.isMine && detail.kind === "strength"
      ? getRecentStrengthWorkoutsForForm({ today, excludeId: workoutId })
      : undefined,
  );
  const [detail, crews, routines, recentWorkouts] = await Promise.all([
    detailPromise,
    getWorkoutFormCrews(user.id),
    getMyRoutinesForForm(),
    recentPromise,
  ]);

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
      today={today}
      closeHref={`/workouts/${detail.id}`}
      saveWorkout={saveWorkout}
      deleteWorkout={deleteWorkout}
      initialPhotos={detail.photos}
      photoActions={{ upload: uploadWorkoutPhoto, remove: deleteWorkoutPhoto }}
      routines={routines}
      recentWorkouts={recentWorkouts}
      updateRoutine={updateRoutineExercises}
    />
  );
}
