"use client";

import { useState, useTransition } from "react";

import { Button } from "@/shared/ui/button";
import { FieldError } from "@/shared/ui/field";

import type { CommentAction } from "../model/comment-form";
import {
  appendOlderComments,
  getOlderCursor,
  INITIAL_OLDER_COMMENTS,
  type LoadOlderComments,
  removeOlderComment,
  syncOlderComments,
  type WorkoutCommentSlice,
} from "../model/comment-page";
import { formatCommentTime } from "../model/comment-time";
import { DeleteComment } from "./delete-comment";

type CommentThreadProps = {
  workoutId: string;
  // 서버(또는 데모 저장소)가 준 최신 묶음. 작성·삭제 뒤 다시 읽으면 새 값으로 바뀐다.
  latest: WorkoutCommentSlice;
  now: Date;
  loadOlder: LoadOlderComments;
  deleteAction: CommentAction;
};

export function CommentThread({ workoutId, latest, now, loadOlder, deleteAction }: CommentThreadProps) {
  const [older, setOlder] = useState(INITIAL_OLDER_COMMENTS);
  const [previousLatest, setPreviousLatest] = useState(latest);
  const [loadError, setLoadError] = useState(false);
  const [pending, startTransition] = useTransition();

  // 최신 묶음이 바뀌면 렌더 중에 이전 댓글을 맞춘다. 새 댓글에 밀려난 댓글이 목록에서 사라지지 않게 한다.
  let current = older;
  if (latest !== previousLatest) {
    current = syncOlderComments(older, previousLatest, latest);
    setPreviousLatest(latest);
    setOlder(current);
  }

  const cursor = getOlderCursor(current, latest);
  const comments = [...current.comments, ...latest.comments];

  const showOlder = () => {
    if (!cursor) return;
    setLoadError(false);
    startTransition(async () => {
      const result = await loadOlder(workoutId, cursor).catch(() => ({ ok: false as const }));
      startTransition(() => {
        if (result.ok) setOlder((value) => appendOlderComments(value, result));
        else setLoadError(true);
      });
    });
  };

  // 최신 묶음은 다시 읽으면 반영되지만, 따로 불러온 이전 댓글은 여기서 지운다.
  const remove: CommentAction = async (state, formData) => {
    const result = await deleteAction(state, formData);
    const commentId = formData.get("commentId");
    if (result.success && typeof commentId === "string") setOlder((value) => removeOlderComment(value, commentId));
    return result;
  };

  return (
    <div className="flex flex-col gap-3">
      {cursor && (
        <div className="flex flex-col items-center gap-1">
          <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={pending} onClick={showOlder}>
            {pending ? "불러오는 중…" : "이전 댓글 보기"}
          </Button>
          {loadError && <FieldError>이전 댓글을 불러오지 못했어요. 다시 눌러 주세요.</FieldError>}
        </div>
      )}
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
              {comment.isMine && <DeleteComment workoutId={workoutId} commentId={comment.id} action={remove} />}
            </div>
            <p className="whitespace-pre-wrap break-words text-body">{comment.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
