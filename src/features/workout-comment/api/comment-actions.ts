"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/entities/crew/model/uuid";
import { requireUser } from "@/shared/api/supabase/require-user";

import { type CommentFormState, validateCommentBody } from "../model/comment-form";

export const createComment = async (_state: CommentFormState, formData: FormData): Promise<CommentFormState> => {
  const { supabase, user } = await requireUser();
  const workoutId = formData.get("workoutId");
  const body = formData.get("body");
  if (!isUuid(workoutId)) return { error: "운동 기록을 다시 확인해 주세요.", success: false };
  const error = validateCommentBody(body);
  if (error || typeof body !== "string") return { error, success: false };
  const result = await supabase
    .from("workout_comments")
    .insert({ workout_id: workoutId, user_id: user.id, body: body.trim() });
  if (result.error)
    return { error: "댓글을 작성하지 못했어요. 기록을 볼 수 있는지 확인하고 다시 시도해 주세요.", success: false };
  revalidatePath(`/workouts/${workoutId}`);
  return { error: null, success: true };
};

export const deleteComment = async (_state: CommentFormState, formData: FormData): Promise<CommentFormState> => {
  const { supabase, user } = await requireUser();
  const workoutId = formData.get("workoutId");
  const commentId = formData.get("commentId");
  if (!isUuid(workoutId) || !isUuid(commentId)) return { error: "댓글을 다시 확인해 주세요.", success: false };
  const result = await supabase
    .from("workout_comments")
    .delete()
    .eq("id", commentId)
    .eq("workout_id", workoutId)
    .eq("user_id", user.id)
    .select("id");
  if (result.error || !result.data?.length)
    return { error: "댓글을 삭제하지 못했어요. 내 댓글인지 확인해 주세요.", success: false };
  revalidatePath(`/workouts/${workoutId}`);
  return { error: null, success: true };
};
