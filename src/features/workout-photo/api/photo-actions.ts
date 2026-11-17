"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/entities/crew/model/uuid";
import { WORKOUT_PHOTO_BUCKET } from "@/entities/workout/model/photo";
import { requireUser } from "@/shared/api/supabase/require-user";

import { buildPhotoPath, checkPhotoBytes, PHOTO_ERROR_MESSAGES } from "../model/image-file";
import type { DeletePhotoResult, UploadPhotoResult } from "../model/photo-draft";

const ERRORS = {
  notFound: "기록을 찾을 수 없거나 내 기록이 아니에요.",
  photoNotFound: "이미 지워졌거나 내 사진이 아니에요.",
  tooMany: "사진은 4장까지 붙일 수 있어요.",
  upload: "사진을 올리지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  remove: "사진을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요.",
} as const;

const revalidatePhotoPaths = (workoutId: string) => {
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${workoutId}`);
};

/**
 * 사진 한 장을 올린다. 파일을 먼저 Storage에 올리고 사진 행을 넣는다(행부터 넣으면 파일 없는 사진이 보인다).
 * 행을 못 넣으면 올린 파일을 지운다. 그것마저 실패한 파일은 행이 없어 남에게 보이지 않고 기록을 지울 때 정리된다.
 * 권한은 Storage·테이블 정책이 판단하고, 여기서 먼저 확인하는 것은 쓸데없는 업로드를 막고 알맞은 문구를 주려는 것이다.
 */
export const uploadWorkoutPhoto = async (workoutId: string, formData: FormData): Promise<UploadPhotoResult> => {
  const { supabase, user } = await requireUser();
  if (!isUuid(workoutId)) return { ok: false, error: ERRORS.notFound };

  const file = formData.get("file");
  if (!(file instanceof Blob)) return { ok: false, error: PHOTO_ERROR_MESSAGES.empty };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkPhotoBytes(bytes);
  if (!checked.ok) return checked;

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .select("id")
    .eq("id", workoutId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (workoutError) return { ok: false, error: ERRORS.upload };
  if (!workout) return { ok: false, error: ERRORS.notFound };

  const { type, width, height } = checked.info;
  const path = buildPhotoPath(user.id, workoutId, crypto.randomUUID(), type);
  const bucket = supabase.storage.from(WORKOUT_PHOTO_BUCKET);

  // 경로마다 새 id라 같은 URL의 내용이 바뀌지 않는다. 오래 캐시해도 된다.
  const uploaded = await bucket.upload(path, bytes, { contentType: type, upsert: false, cacheControl: "31536000" });
  if (uploaded.error) return { ok: false, error: ERRORS.upload };

  const { data: photo, error } = await supabase
    .from("workout_photos")
    .insert({ workout_id: workoutId, path, width, height })
    .select("id")
    .single();
  if (error) {
    await bucket.remove([path]);
    return { ok: false, error: error.message === "too_many_photos" ? ERRORS.tooMany : ERRORS.upload };
  }

  revalidatePhotoPaths(workoutId);
  return { ok: true, photo: { id: photo.id } };
};

/**
 * 사진 한 장을 지운다. 행을 먼저 지우면 그 순간부터 아무도(작성자 말고) 파일을 읽을 수 없다.
 * 파일 삭제가 실패해도 사진은 지워진 것으로 본다. 남은 파일은 기록을 지울 때 폴더째 정리된다.
 */
export const deleteWorkoutPhoto = async (photoId: string): Promise<DeletePhotoResult> => {
  const { supabase } = await requireUser();
  if (!isUuid(photoId)) return { ok: false, error: ERRORS.photoNotFound };

  // 남의 사진은 RLS 때문에 0건이 지워진다. 조용히 성공으로 보지 않도록 지운 행을 돌려받는다.
  const { data, error } = await supabase.from("workout_photos").delete().eq("id", photoId).select("workout_id, path");
  if (error) return { ok: false, error: ERRORS.remove };
  const [deleted] = data;
  if (!deleted) return { ok: false, error: ERRORS.photoNotFound };

  await supabase.storage.from(WORKOUT_PHOTO_BUCKET).remove([deleted.path]);

  revalidatePhotoPaths(deleted.workout_id);
  return { ok: true };
};
