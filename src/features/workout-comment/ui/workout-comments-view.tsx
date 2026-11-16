import { ChatCircleIcon } from "@phosphor-icons/react/ssr";

import { EmptyState } from "@/shared/ui/empty-state";

import type { CommentAction } from "../model/comment-form";
import type { LoadOlderComments, WorkoutCommentPage } from "../model/comment-page";
import { CommentForm } from "./comment-form";
import { CommentThread } from "./comment-thread";

type WorkoutCommentsViewProps = {
  workoutId: string;
  // 최신 댓글 묶음과 전체 개수. 불러오기에 실패하면 null. 빈 목록과 구분해 안내한다.
  page: WorkoutCommentPage | null;
  now: Date;
  loadOlder: LoadOlderComments;
  createAction: CommentAction;
  deleteAction: CommentAction;
};

export function WorkoutCommentsView({
  workoutId,
  page,
  now,
  loadOlder,
  createAction,
  deleteAction,
}: WorkoutCommentsViewProps) {
  return (
    <section id="workout-comments" aria-labelledby="workout-comments-title" className="flex flex-col gap-4">
      <h2 id="workout-comments-title" className="font-semibold text-title">
        응원 댓글
        {page?.total ? (
          <span className="ml-2 text-muted-foreground tabular-nums">
            <span className="sr-only">, </span>
            {page.total}개
          </span>
        ) : null}
      </h2>
      {page === null ? (
        <p role="alert" className="text-body text-destructive">
          댓글을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      ) : page.comments.length ? (
        <CommentThread
          workoutId={workoutId}
          latest={page}
          now={now}
          loadOlder={loadOlder}
          deleteAction={deleteAction}
        />
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
