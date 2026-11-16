"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { isUuid } from "@/entities/crew/model/uuid";
import { requireUser } from "@/shared/api/supabase/require-user";

import { type CommentFormState, validateCommentBody } from "../model/comment-form";
import { decodeCommentCursor, type OlderCommentsResult } from "../model/comment-page";
import { getOlderWorkoutComments } from "./queries";

// "이전 댓글 보기". 클라이언트가 보낸 값이라 기록 ID와 커서를 다시 검사한다. 실패는 화면에서 안내하도록 값으로 돌려준다.
export const loadOlderComments = async (workoutId: string, cursor: string): Promise<OlderCommentsResult> => {
  const decoded = decodeCommentCursor(cursor);
  if (!isUuid(workoutId) || !decoded) return { ok: false };
  try {
    return { ok: true, ...(await getOlderWorkoutComments(workoutId, decoded)) };
  } catch (error) {
    // 로그인 이동 같은 Next.js 내부 흐름은 그대로 넘긴다.
    unstable_rethrow(error);
    return { ok: false };
  }
};

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
