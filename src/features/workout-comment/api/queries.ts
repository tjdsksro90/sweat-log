import "server-only";

import { isUuid } from "@/entities/crew/model/uuid";
import { requireUser } from "@/shared/api/supabase/require-user";

import type { WorkoutComment } from "../model/comment";
import {
  COMMENT_PAGE_SIZE,
  type CommentCursor,
  toCommentSlice,
  type WorkoutCommentPage,
  type WorkoutCommentSlice,
} from "../model/comment-page";

const EMPTY_PAGE: WorkoutCommentPage = { comments: [], olderCursor: null, total: 0 };

type Session = Awaited<ReturnType<typeof requireUser>>;

// 최신순으로 한 개 더 읽어 더 오래된 댓글이 있는지 함께 안다. 커서가 있으면 그보다 오래된 댓글만 읽는다.
const readSlice = async (
  { supabase, user }: Session,
  workoutId: string,
  cursor: CommentCursor | null,
): Promise<WorkoutCommentSlice> => {
  let query = supabase
    .from("workout_comments")
    .select("id, user_id, body, created_at, profiles(nickname)")
    .eq("workout_id", workoutId);
  if (cursor) {
    // 값은 decodeCommentCursor가 형식을 검사한 시각과 UUID만 온다. 따옴표로 감싸 시각의 : . + 를 그대로 넘긴다.
    query = query.or(`created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt.${cursor.id})`);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(COMMENT_PAGE_SIZE + 1);
  if (error) throw new Error("댓글을 불러오지 못했어요.");
  // 탈퇴한 작성자의 프로필은 RLS로 숨겨져도 댓글 자체는 남긴다.
  const comments: WorkoutComment[] = data.map((comment) => ({
    id: comment.id,
    userId: comment.user_id,
    nickname: comment.profiles?.nickname ?? null,
    body: comment.body,
    createdAt: comment.created_at,
    isMine: comment.user_id === user.id,
  }));
  return toCommentSlice(comments);
};

// 최신 댓글 묶음과 전체 개수. 개수는 목록 길이가 아니라 따로 센다.
export const getWorkoutComments = async (workoutId: string): Promise<WorkoutCommentPage> => {
  if (!isUuid(workoutId)) return EMPTY_PAGE;
  const session = await requireUser();
  const [slice, count] = await Promise.all([
    readSlice(session, workoutId, null),
    session.supabase.from("workout_comments").select("id", { count: "exact", head: true }).eq("workout_id", workoutId),
  ]);
  if (count.error || count.count === null) throw new Error("댓글을 불러오지 못했어요.");
  return { ...slice, total: count.count };
};

// 커서보다 오래된 댓글 묶음. 커서 검증은 부르는 쪽(Server Action)이 한다.
export const getOlderWorkoutComments = async (workoutId: string, cursor: CommentCursor): Promise<WorkoutCommentSlice> =>
  readSlice(await requireUser(), workoutId, cursor);
