import "server-only";

import { isUuid } from "@/entities/crew/model/uuid";
import { requireUser } from "@/shared/api/supabase/require-user";

import type { WorkoutComment } from "../model/comment";

export const getWorkoutComments = async (workoutId: string): Promise<WorkoutComment[]> => {
  if (!isUuid(workoutId)) return [];
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("workout_comments")
    .select("id, user_id, body, created_at, profiles(nickname)")
    .eq("workout_id", workoutId)
    .order("created_at")
    .order("id");
  if (error) throw new Error("댓글을 불러오지 못했어요.");
  // 탈퇴한 작성자의 프로필은 RLS로 숨겨져도 댓글 자체는 남긴다.
  return data.map((comment) => ({
    id: comment.id,
    userId: comment.user_id,
    nickname: comment.profiles?.nickname ?? "운동 친구",
    body: comment.body,
    createdAt: comment.created_at,
    isMine: comment.user_id === user.id,
  }));
};
