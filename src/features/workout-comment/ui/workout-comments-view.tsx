import { ChatCircleIcon } from "@phosphor-icons/react/ssr";

import { EmptyState } from "@/shared/ui/empty-state";

import type { WorkoutComment } from "../model/comment";
import type { CommentAction } from "../model/comment-form";
import { formatCommentTime } from "../model/comment-time";
import { CommentForm } from "./comment-form";
import { DeleteComment } from "./delete-comment";

type WorkoutCommentsViewProps = {
  workoutId: string;
  // 불러오기에 실패하면 null. 빈 목록과 구분해 안내한다.
  comments: WorkoutComment[] | null;
  now: Date;
  createAction: CommentAction;
  deleteAction: CommentAction;
};

export function WorkoutCommentsView({
  workoutId,
  comments,
  now,
  createAction,
  deleteAction,
}: WorkoutCommentsViewProps) {
  return (
    <section id="workout-comments" aria-labelledby="workout-comments-title" className="flex flex-col gap-4">
      <h2 id="workout-comments-title" className="font-semibold text-title">
        응원 댓글
        {comments?.length ? (
          <span className="ml-2 text-muted-foreground tabular-nums">
            <span className="sr-only">, </span>
            {comments.length}개
          </span>
        ) : null}
      </h2>
      {comments === null ? (
        <p role="alert" className="text-body text-destructive">
          댓글을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      ) : comments.length ? (
        <ul className="flex flex-col">
          {comments.map((comment) => (
            <li key={comment.id} className="flex flex-col gap-1 border-b py-3 first:pt-0 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-caption">
                  <span className="min-w-0 break-words font-semibold">{comment.nickname ?? "알 수 없는 사용자"}</span>
                  {comment.isMine && <span className="text-muted-foreground">(나)</span>}
                  <time className="text-muted-foreground" dateTime={comment.createdAt}>
                    {formatCommentTime(comment.createdAt, now)}
                  </time>
                </p>
                {comment.isMine && <DeleteComment workoutId={workoutId} commentId={comment.id} action={deleteAction} />}
              </div>
              <p className="whitespace-pre-wrap break-words text-body">{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<ChatCircleIcon size={28} />}
          title="아직 댓글이 없어요"
          description="첫 응원을 남겨 보세요."
          className="py-6"
        />
      )}
      <CommentForm workoutId={workoutId} action={createAction} />
    </section>
  );
}
