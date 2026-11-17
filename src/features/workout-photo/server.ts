import "server-only";

import { WORKOUT_PHOTO_BUCKET } from "@/entities/workout/model/photo";
import type { requireUser } from "@/shared/api/supabase/require-user";

type SupabaseClient = Awaited<ReturnType<typeof requireUser>>["supabase"];

/**
 * 기록을 지운 뒤 그 기록 폴더의 파일을 모두 지운다. 사진 행은 DB cascade로 이미 사라졌고,
 * Storage는 SQL 삭제를 막아 두어서 API로 지운다. 행이 없던 파일(업로드 뒤 행 저장 실패)도 함께 정리된다.
 * 실패해도 기록 삭제는 이미 끝났으므로 오류를 돌려주지 않는다. 남은 파일은 사진 행이 없어 작성자 말고는 읽을 수 없다.
 */
export const removeWorkoutPhotoFiles = async (supabase: SupabaseClient, userId: string, workoutId: string) => {
  const folder = `${userId}/${workoutId}`;
  const bucket = supabase.storage.from(WORKOUT_PHOTO_BUCKET);

  try {
    const { data, error } = await bucket.list(folder, { limit: 100 });
    if (error || data.length === 0) return;
    await bucket.remove(data.map((file) => `${folder}/${file.name}`));
  } catch {
    // 위 주석처럼 남은 파일은 보이지 않으므로 삭제 결과에 영향을 주지 않는다.
  }
};
