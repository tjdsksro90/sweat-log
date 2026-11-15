export type CommentFormState = { error: string | null; success: boolean };

export const INITIAL_COMMENT_FORM_STATE: CommentFormState = { error: null, success: false };

export const validateCommentBody = (body: unknown) => {
  if (typeof body !== "string" || Array.from(body.trim()).length < 1 || Array.from(body.trim()).length > 500) {
    return "댓글은 1~500자로 적어 주세요.";
  }
  return null;
};

export const isCommentResourceId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
