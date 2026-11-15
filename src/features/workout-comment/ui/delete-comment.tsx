"use client";

import { useActionState, useState } from "react";

import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/shared/ui/bottom-sheet";
import { Button } from "@/shared/ui/button";
import { FieldError } from "@/shared/ui/field";

import { type CommentFormState, INITIAL_COMMENT_FORM_STATE } from "../model/comment-form";

type DeleteCommentProps = {
  workoutId: string;
  commentId: string;
  action: (state: CommentFormState, formData: FormData) => Promise<CommentFormState>;
};

export function DeleteComment({ workoutId, commentId, action }: DeleteCommentProps) {
  const [open, setOpen] = useState(false);
  const [state, submit, pending] = useActionState(async (previous: CommentFormState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result.success) setOpen(false);
    return result;
  }, INITIAL_COMMENT_FORM_STATE);
  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) setOpen(nextOpen);
      }}
    >
      <BottomSheetTrigger render={<Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" />}>
        삭제
      </BottomSheetTrigger>
      <BottomSheetContent showCloseButton={!pending}>
        <BottomSheetHeader>
          <BottomSheetTitle>댓글을 삭제할까요?</BottomSheetTitle>
          <BottomSheetDescription>삭제한 댓글은 되돌릴 수 없어요.</BottomSheetDescription>
        </BottomSheetHeader>
        <form action={submit}>
          <input type="hidden" name="workoutId" value={workoutId} />
          <input type="hidden" name="commentId" value={commentId} />
          {state.error && <FieldError className="px-5">{state.error}</FieldError>}
          <BottomSheetFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "삭제하는 중…" : "삭제 확인"}
            </Button>
            <BottomSheetClose render={<Button type="button" variant="outline" disabled={pending} />}>
              취소
            </BottomSheetClose>
          </BottomSheetFooter>
        </form>
      </BottomSheetContent>
    </BottomSheet>
  );
}
