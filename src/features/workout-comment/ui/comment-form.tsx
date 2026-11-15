"use client";

import { type FormEvent, startTransition, useActionState, useId, useState } from "react";

import { Button } from "@/shared/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/ui/field";
import { Textarea } from "@/shared/ui/textarea";

import {
  type CommentFormState,
  getCommentLength,
  INITIAL_COMMENT_FORM_STATE,
  MAX_COMMENT_LENGTH,
  validateCommentBody,
} from "../model/comment-form";

type CommentFormProps = {
  workoutId: string;
  action: (state: CommentFormState, formData: FormData) => Promise<CommentFormState>;
};

export function CommentForm({ workoutId, action }: CommentFormProps) {
  const id = useId();
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [state, submit, pending] = useActionState(async (previous: CommentFormState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result.success) setBody("");
    return result;
  }, INITIAL_COMMENT_FORM_STATE);
  const error = localError ?? state.error;
  const length = getCommentLength(body);

  /**
   * form action은 실패해도 입력을 비우므로, 직접 제출해 실패 시 쓰던 댓글을 남긴다.
   * action도 함께 걸어 두어 hydration 전에 눌러도 댓글이 GET 주소에 실려 나가지 않게 한다.
   */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateCommentBody(body);
    setLocalError(validationError);
    if (validationError) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => submit(formData));
  };

  return (
    <form action={submit} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="workoutId" value={workoutId} />
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={id}>댓글 남기기</FieldLabel>
        <Textarea
          id={id}
          name="body"
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            if (localError) setLocalError(null);
          }}
          rows={3}
          className="min-h-24"
          placeholder="오늘의 땀을 응원해 주세요"
          readOnly={pending}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-count${error ? ` ${id}-error` : ""}`}
        />
        <FieldDescription id={`${id}-count`} className="text-right tabular-nums">
          {length}/{MAX_COMMENT_LENGTH}자
        </FieldDescription>
        {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      </Field>
      <Button type="submit" variant="secondary" className="self-end" disabled={pending}>
        {pending ? "남기는 중…" : "댓글 남기기"}
      </Button>
    </form>
  );
}
