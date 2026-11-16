import type { WorkoutComment } from "./comment";

/**
 * 댓글은 최신 COMMENT_PAGE_SIZE개부터 보여 주고, 더 오래된 댓글은 커서로 이어서 불러온다.
 * 한 번에 다 읽으면 Supabase max_rows(1000)에 걸려 오래된 1000개만 오고 새 댓글이 빠진다.
 */
export const COMMENT_PAGE_SIZE = 50;

// 화면에 보여 줄 묶음. comments는 오래된 순서다. olderCursor가 있으면 그보다 오래된 댓글이 더 있다.
export type WorkoutCommentSlice = { comments: WorkoutComment[]; olderCursor: string | null };
// 처음 보여 주는 최신 묶음. total은 목록과 따로 센 전체 댓글 수다.
export type WorkoutCommentPage = WorkoutCommentSlice & { total: number };

export type OlderCommentsResult = ({ ok: true } & WorkoutCommentSlice) | { ok: false };
// 이전 댓글 불러오기. 실제 앱은 Server Action을, 체험 데모는 저장소 함수를 넘긴다.
export type LoadOlderComments = (workoutId: string, cursor: string) => Promise<OlderCommentsResult>;

// 정렬 키는 (작성 시각, id). 작성 시각은 DB가 준 문자열 그대로 둔다. Date로 바꾸면 마이크로초가 잘린다.
export type CommentCursor = { createdAt: string; id: string };

const compare = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

// 같은 출처(DB 또는 데모 저장소)의 시각은 형식이 같으므로 문자열로 비교한다.
export const compareComments = (left: CommentCursor, right: CommentCursor) =>
  compare(left.createdAt, right.createdAt) || compare(left.id, right.id);

const toBase64Url = (value: string) => btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
const fromBase64Url = (value: string) => atob(value.replaceAll("-", "+").replaceAll("_", "/"));

export const encodeCommentCursor = ({ createdAt, id }: CommentCursor) => toBase64Url(JSON.stringify([createdAt, id]));

// PostgREST timestamptz(2026-11-14T06:10:00.123456+00:00)와 데모의 toISOString(…Z) 모양만 받는다.
// 오프셋은 Postgres가 받는 ±15:59까지. 형식이 틀린 값이 쿼리로 가면 DB 형 변환에서 실패한다.
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-](0\d|1[0-5]):[0-5]\d)$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidTimestamp = (value: string) => {
  if (!TIMESTAMP_PATTERN.test(value) || value.startsWith("0000")) return false;
  const date = value.slice(0, 10);
  // 2026-02-30처럼 모양만 맞는 날짜는 Date가 다음 달로 넘기므로 되돌린 값과 비교한다.
  return (
    new Date(`${date}T00:00:00Z`).toISOString().startsWith(date) &&
    !Number.isNaN(Date.parse(value.replace(/(\.\d{3})\d+/, "$1")))
  );
};

// 망가진 커서(클라이언트가 보낸 값)는 null.
export const decodeCommentCursor = (value: unknown): CommentCursor | null => {
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(value));
    if (!Array.isArray(parsed) || parsed.length !== 2 || !parsed.every((part) => typeof part === "string")) return null;
    const [createdAt, id] = parsed as string[];
    return isValidTimestamp(createdAt) && UUID_PATTERN.test(id) ? { createdAt, id } : null;
  } catch {
    return null;
  }
};

/**
 * 최신순으로 pageSize + 1개를 읽은 결과를 화면용 묶음으로 바꾼다.
 * 하나 더 읽혔으면 더 오래된 댓글이 있다는 뜻이고, 보여 주는 것 중 가장 오래된 댓글이 다음 커서가 된다.
 */
export const toCommentSlice = (newestFirst: WorkoutComment[], pageSize = COMMENT_PAGE_SIZE): WorkoutCommentSlice => {
  const comments = newestFirst.slice(0, pageSize).reverse();
  const hasOlder = newestFirst.length > pageSize && comments.length > 0;
  return { comments, olderCursor: hasOlder ? encodeCommentCursor(comments[0]) : null };
};

// 오래된 순으로 정렬된 전체 목록에서 커서보다 오래된 묶음을 자른다. 체험 데모 저장소가 쓴다.
export const sliceComments = (
  oldestFirst: WorkoutComment[],
  cursor: CommentCursor | null,
  pageSize = COMMENT_PAGE_SIZE,
): WorkoutCommentSlice => {
  const older = cursor ? oldestFirst.filter((comment) => compareComments(comment, cursor) < 0) : oldestFirst;
  return toCommentSlice(older.slice(-(pageSize + 1)).reverse(), pageSize);
};

const mergeById = (comments: WorkoutComment[]) =>
  [...new Map(comments.map((comment) => [comment.id, comment])).values()].sort(compareComments);

/**
 * 화면이 따로 불러온 이전 댓글. 서버가 다시 준 최신 묶음과 겹치지 않게 유지한다.
 * - expanded: "이전 댓글 보기"를 한 번이라도 눌렀는지. 누르기 전에는 최신 묶음만 보여 준다.
 * - cursor: 다음으로 더 불러올 위치. null이면 처음 댓글까지 다 불러왔다.
 */
export type OlderComments = { expanded: boolean; comments: WorkoutComment[]; cursor: string | null };

export const INITIAL_OLDER_COMMENTS: OlderComments = { expanded: false, comments: [], cursor: null };

/**
 * 최신 묶음이 바뀌었을 때(댓글 작성·삭제 뒤 다시 읽기) 이전 댓글을 맞춘다.
 * 새 댓글이 생기면 최신 묶음이 앞으로 밀리며 맨 앞 댓글이 빠지는데, 펼쳐 둔 상태라면 그 댓글을 이전 댓글로 옮겨
 * 목록 중간이 비지 않게 한다. 최신 묶음에 다시 들어온 댓글은 이전 댓글에서 뺀다.
 */
export const syncOlderComments = (
  older: OlderComments,
  previous: WorkoutCommentSlice,
  next: WorkoutCommentSlice,
): OlderComments => {
  if (!older.expanded) return older;
  // 최신 묶음이 처음 댓글까지 다 담으면 따로 둘 이전 댓글이 없다.
  if (next.olderCursor === null) return INITIAL_OLDER_COMMENTS;
  const boundary = next.comments[0];
  return {
    ...older,
    comments: mergeById([...older.comments, ...previous.comments]).filter(
      (comment) => compareComments(comment, boundary) < 0,
    ),
  };
};

// 지금 "이전 댓글 보기"로 넘길 커서. null이면 버튼을 숨긴다.
export const getOlderCursor = (older: OlderComments, latest: WorkoutCommentSlice) =>
  latest.olderCursor === null ? null : older.expanded ? older.cursor : latest.olderCursor;

export const appendOlderComments = (older: OlderComments, loaded: WorkoutCommentSlice): OlderComments => ({
  expanded: true,
  comments: mergeById([...loaded.comments, ...older.comments]),
  cursor: loaded.olderCursor,
});

export const removeOlderComment = (older: OlderComments, commentId: string): OlderComments => ({
  ...older,
  comments: older.comments.filter((comment) => comment.id !== commentId),
});
