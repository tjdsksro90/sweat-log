/**
 * 목록 커서. 마지막 항목의 (날짜, 작성 시각, id)를 담는다. list_workouts가 이 순서로 내림차순 정렬한다.
 * 화면은 내용을 몰라도 된다. getWorkoutPage가 준 nextCursor를 그대로 다음 filter.cursor로 넘긴다.
 */
export type WorkoutCursor = {
  workoutDate: string;
  createdAt: string; // DB가 준 문자열 그대로. Date로 바꾸면 마이크로초가 잘려 같은 항목을 다시 받는다.
  id: string;
};

const toBase64Url = (value: string) => btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

const fromBase64Url = (value: string) => atob(value.replaceAll("-", "+").replaceAll("_", "/"));

export const encodeWorkoutCursor = (cursor: WorkoutCursor) =>
  toBase64Url(JSON.stringify([cursor.workoutDate, cursor.createdAt, cursor.id]));

// 연도 0000은 JS Date는 받지만 Postgres date는 거부한다(서기 1년 전은 BC 표기).
const DATE_PATTERN = /^(?!0000)\d{4}-\d{2}-\d{2}$/;
// PostgREST가 주는 timestamptz 모양: 2026-11-14T06:10:00.123456+00:00
// 오프셋은 Postgres가 받는 ±15:59까지만. +16:00 이상은 JS Date는 받아도 DB에서 형 변환 오류가 난다.
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-](0\d|1[0-5]):[0-5]\d)$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 2026-02-30처럼 모양만 맞는 날짜는 Date가 3월로 넘겨 버리므로 되돌린 값과 비교한다.
const isValidDate = (date: string) =>
  DATE_PATTERN.test(date) && new Date(`${date}T00:00:00Z`).toISOString().startsWith(date);

const isValidTimestamp = (timestamp: string) =>
  TIMESTAMP_PATTERN.test(timestamp) &&
  isValidDate(timestamp.slice(0, 10)) &&
  !Number.isNaN(Date.parse(timestamp.replace(/(\.\d{3})\d+/, "$1")));

/**
 * 망가진 커서(손으로 고친 URL 등)는 null. 호출하는 쪽은 첫 페이지로 본다.
 * 값까지 검사해야 한다. 형식이 틀린 값이 RPC로 가면 DB 타입 변환에서 실패해 첫 페이지로 돌아가지 못한다.
 */
export const decodeWorkoutCursor = (value: string): WorkoutCursor | null => {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(value));

    if (!Array.isArray(parsed) || parsed.length !== 3 || !parsed.every((part) => typeof part === "string")) {
      return null;
    }

    const [workoutDate, createdAt, id] = parsed as string[];

    if (!isValidDate(workoutDate) || !isValidTimestamp(createdAt) || !UUID_PATTERN.test(id)) {
      return null;
    }

    return { workoutDate, createdAt, id };
  } catch {
    return null;
  }
};
