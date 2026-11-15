export type CommentFormState = { error: string | null; success: boolean };

export const INITIAL_COMMENT_FORM_STATE: CommentFormState = { error: null, success: false };

export const MAX_COMMENT_LENGTH = 500;

// DB의 char_length(btrim(body))와 맞추려고 UTF-16 단위가 아닌 코드 포인트로 센다.
export const getCommentLength = (body: string) => Array.from(body.trim()).length;

export const validateCommentBody = (body: unknown) => {
  if (typeof body !== "string") return "댓글은 1~500자로 적어 주세요.";
  const length = getCommentLength(body);
  if (length < 1 || length > MAX_COMMENT_LENGTH) return "댓글은 1~500자로 적어 주세요.";
  return null;
};
