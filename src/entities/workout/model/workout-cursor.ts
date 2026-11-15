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

// 망가진 커서(손으로 고친 URL 등)는 null. 호출하는 쪽은 첫 페이지로 본다.
export const decodeWorkoutCursor = (value: string): WorkoutCursor | null => {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(value));

    if (!Array.isArray(parsed) || parsed.length !== 3 || !parsed.every((part) => typeof part === "string")) {
      return null;
    }

    const [workoutDate, createdAt, id] = parsed as string[];
    return { workoutDate, createdAt, id };
  } catch {
    return null;
  }
};
