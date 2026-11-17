"use server";

import { revalidatePath } from "next/cache";

import type { WorkoutInput } from "@/entities/workout/model/contracts";
import { toSaveWorkoutPayload } from "@/entities/workout/model/workout-mappers";
import { captureWorkoutAudience, notifyWorkoutSaved } from "@/features/push-notification/server";
import { removeWorkoutPhotoFiles } from "@/features/workout-photo/server";
import { requireUser } from "@/shared/api/supabase/require-user";

import { getWorkoutErrorMessage, isUuid, parseWorkoutInput } from "../model/save-workout-input";

export type SaveWorkoutResult = { ok: true; id: string } | { ok: false; error: string };
export type DeleteWorkoutResult = { ok: true } | { ok: false; error: string };

// 기록이 바뀌면 보이는 곳: 홈 주간 요약, 기록 목록, 상세
const revalidateWorkoutPaths = (id: string) => {
  revalidatePath("/");
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${id}`);
};

// 작성(id 없음)과 수정(id 있음)을 함께 받는다. 권한은 save_workout(security invoker)과 RLS가 판단한다.
export const saveWorkout = async (input: WorkoutInput): Promise<SaveWorkoutResult> => {
  const { supabase, user } = await requireUser();

  const parsed = parseWorkoutInput(input);
  if (!parsed.ok) return { error: parsed.error, ok: false };

  // 수정이면 새로 추가된 동행자·크루에만 알리도록 저장 전 공개 범위를 읽어 둔다.
  const before = parsed.input.id ? await captureWorkoutAudience(supabase, parsed.input.id) : null;

  const { data: workoutId, error } = await supabase.rpc("save_workout", {
    p_input: toSaveWorkoutPayload(parsed.input),
  });
  if (error) return { error: getWorkoutErrorMessage(error), ok: false };

  notifyWorkoutSaved({ actorId: user.id, before, supabase, workoutId });
  revalidateWorkoutPaths(workoutId);
  return { id: workoutId, ok: true };
};

// 상세(run_details, strength_sets)와 동행자, 댓글, 사진 행은 on delete cascade로 함께 지워진다.
// 사진 파일은 SQL로 지울 수 없어서 기록을 지운 뒤 Storage API로 정리한다.
export const deleteWorkout = async (id: string): Promise<DeleteWorkoutResult> => {
  const { supabase, user } = await requireUser();
  if (!isUuid(id)) return { error: getWorkoutErrorMessage({ message: "workout_not_found" }), ok: false };

  // 남의 기록은 RLS 때문에 0건이 지워진다. 조용히 성공으로 보지 않도록 지운 행을 돌려받는다.
  const { data, error } = await supabase.from("workouts").delete().eq("id", id).eq("user_id", user.id).select("id");
  if (error) return { error: getWorkoutErrorMessage(error), ok: false };
  if (data.length === 0) return { error: getWorkoutErrorMessage({ message: "workout_not_found" }), ok: false };

  await removeWorkoutPhotoFiles(supabase, user.id, id);

  revalidateWorkoutPaths(id);
  return { ok: true };
};
