import type { CrewDetail, CrewSummary } from "@/entities/crew/model/crew";
import type {
  WeeklySummary,
  WorkoutDetail,
  WorkoutInput,
  WorkoutListFilter,
  WorkoutPage,
} from "@/entities/workout/model/contracts";
import { addDays, buildWeeklySummary, getKstToday, getWeekStart } from "@/entities/workout/model/weekly-summary";
import { decodeWorkoutCursor, encodeWorkoutCursor, type WorkoutCursor } from "@/entities/workout/model/workout-cursor";
import { toWorkoutDetail, toWorkoutListItem, type WorkoutDetailRow } from "@/entities/workout/model/workout-mappers";
import type { DeleteWorkoutResult, SaveWorkoutResult } from "@/features/workout/api/workout-actions";
import { getWorkoutErrorMessage, isUuid, parseWorkoutInput } from "@/features/workout/model/save-workout-input";
import type { WorkoutComment } from "@/features/workout-comment/model/comment";
import { type CommentFormState, validateCommentBody } from "@/features/workout-comment/model/comment-form";
import { toWorkoutFormCrews } from "@/widgets/workout-form/model/crews";
import type { WorkoutFormCrew } from "@/widgets/workout-form/model/types";

import { createSampleData, DEMO_CREW, DEMO_USER, type DemoState } from "./sample-data";

export const DEMO_STORAGE_KEY = "sweat-log:demo:v1";
const PAGE_SIZE = 20;
export type DemoStorage = Pick<Storage, "getItem" | "setItem">;
export type DemoStoreOptions = {
  now?: () => Date;
  storage?: () => DemoStorage | null;
};

const browserStorage = (): DemoStorage | null => (typeof window === "undefined" ? null : window.sessionStorage);
const compare = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
const compareCursor = (left: WorkoutCursor, right: WorkoutCursor) =>
  compare(left.workoutDate, right.workoutDate) ||
  compare(left.createdAt, right.createdAt) ||
  compare(left.id, right.id);
const cursorOf = (row: WorkoutDetailRow): WorkoutCursor => ({
  workoutDate: row.workout_date,
  createdAt: row.created_at,
  id: row.id,
});

// 손상된 JSON이나 이전 저장 형식은 샘플로 되돌린다. 중첩된 행도 사용 전에 검증한다.
const restore = (raw: string): DemoState | null => {
  const state = JSON.parse(raw) as DemoState;
  if (
    state?.version !== 1 ||
    !Array.isArray(state.workouts) ||
    !state.comments ||
    typeof state.comments !== "object" ||
    Array.isArray(state.comments)
  )
    return null;
  const ids = new Set<string>();
  for (const row of state.workouts) {
    if (!row || ids.has(row.id) || !decodeWorkoutCursor(encodeWorkoutCursor(cursorOf(row)))) return null;
    ids.add(row.id);
    const detail = toWorkoutDetail(row, DEMO_USER.id);
    const parsed = parseWorkoutInput(
      {
        id: row.id,
        kind: detail.kind,
        workoutDate: detail.workoutDate,
        title: detail.title,
        memo: detail.memo,
        placeName: detail.placeName,
        crewId: detail.crew?.id ?? null,
        companionIds: detail.companions.map((person) => person.id),
        durationSeconds: detail.durationSeconds,
        run: detail.run,
        exercises: detail.exercises,
      },
      "9999-12-31",
    );
    if (
      !parsed.ok ||
      !DEMO_CREW.members.some((member) => member.userId === row.user_id) ||
      row.author?.id !== row.user_id ||
      typeof row.author.nickname !== "string" ||
      (row.crew !== null && (row.crew.id !== DEMO_CREW.id || typeof row.crew.name !== "string"))
    )
      return null;
  }
  for (const [workoutId, comments] of Object.entries(state.comments)) {
    if (!ids.has(workoutId) || !Array.isArray(comments)) return null;
    for (const comment of comments) {
      if (
        !comment ||
        !isUuid(comment.id) ||
        !isUuid(comment.userId) ||
        (comment.nickname !== null && typeof comment.nickname !== "string") ||
        validateCommentBody(comment.body) ||
        typeof comment.createdAt !== "string" ||
        Number.isNaN(Date.parse(comment.createdAt)) ||
        typeof comment.isMine !== "boolean"
      )
        return null;
    }
  }
  return state;
};

export const createDemoStore = ({ now = () => new Date(), storage = browserStorage }: DemoStoreOptions = {}) => {
  let state: DemoState | undefined;
  let storageReady = false;
  let persistence: DemoStorage | null = null;
  const persist = () => {
    try {
      persistence?.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    } catch {
      persistence = null;
    }
  };
  const read = (): DemoState => {
    if (!storageReady) {
      storageReady = true;
      try {
        persistence = storage();
        const raw = persistence?.getItem(DEMO_STORAGE_KEY);
        if (raw) {
          try {
            state = restore(raw) ?? undefined;
          } catch {
            state = undefined;
          }
        }
      } catch {
        persistence = null;
      }
    }
    if (!state) {
      state = createSampleData(now());
      persist();
    }
    return state;
  };
  const withComments = (row: WorkoutDetailRow): WorkoutDetailRow => ({
    ...row,
    comments: [{ count: read().comments[row.id]?.length ?? 0 }],
  });
  const failure = (message: string): { ok: false; error: string } => ({
    ok: false,
    error: getWorkoutErrorMessage({ message }),
  });

  const getWorkoutPage = async (filter: WorkoutListFilter = {}): Promise<WorkoutPage> => {
    const cursor = filter.cursor ? decodeWorkoutCursor(filter.cursor) : null;
    const rows = read()
      .workouts.filter(
        (row) =>
          (filter.crewId
            ? row.crew?.id === filter.crewId
            : row.user_id === DEMO_USER.id || row.companions.some(({ profile }) => profile?.id === DEMO_USER.id)) &&
          (!filter.from || row.workout_date >= filter.from) &&
          (!filter.to || row.workout_date <= filter.to) &&
          (!filter.kind || row.kind === filter.kind) &&
          (!cursor || compareCursor(cursorOf(row), cursor) < 0),
      )
      .sort((a, b) => compareCursor(cursorOf(b), cursorOf(a)));
    const page = rows.slice(0, PAGE_SIZE);
    const last = page.at(-1);
    return structuredClone({
      items: page.map((row) => toWorkoutListItem(withComments(row))),
      nextCursor: rows.length > PAGE_SIZE && last ? encodeWorkoutCursor(cursorOf(last)) : null,
    });
  };
  const getWorkoutDetail = async (id: string): Promise<WorkoutDetail | null> => {
    const row = read().workouts.find((workout) => workout.id === id);
    return row ? structuredClone(toWorkoutDetail(withComments(row), DEMO_USER.id)) : null;
  };
  const getWeeklySummary = async (today = getKstToday(now())): Promise<WeeklySummary> => {
    const mine = read().workouts.filter((row) => row.user_id === DEMO_USER.id);
    const dates = new Set(mine.map((row) => row.workout_date));
    let date = dates.has(today) ? today : addDays(today, -1);
    let streakDays = 0;
    while (dates.has(date)) {
      streakDays++;
      date = addDays(date, -1);
    }
    const start = getWeekStart(today);
    return buildWeeklySummary({
      today,
      streakDays,
      weekWorkouts: mine.filter((row) => row.workout_date >= start && row.workout_date <= addDays(start, 6)),
    });
  };
  const getMyCrews = async (): Promise<CrewSummary[]> => [
    { id: DEMO_CREW.id, name: DEMO_CREW.name, memberCount: DEMO_CREW.members.length },
  ];
  const getCrew = async (id: string): Promise<CrewDetail | null> =>
    id === DEMO_CREW.id ? structuredClone(DEMO_CREW) : null;
  const getWorkoutFormCrews = async (currentUserId: string = DEMO_USER.id): Promise<WorkoutFormCrew[]> =>
    toWorkoutFormCrews([DEMO_CREW], currentUserId);
  const getWorkoutComments = async (workoutId: string): Promise<WorkoutComment[]> => {
    if (!isUuid(workoutId)) return [];
    return structuredClone(read().comments[workoutId] ?? [])
      .map((comment) => ({ ...comment, isMine: comment.userId === DEMO_USER.id }))
      .sort((a, b) => compare(a.createdAt, b.createdAt) || compare(a.id, b.id));
  };

  const saveWorkout = async (input: WorkoutInput): Promise<SaveWorkoutResult> => {
    const parsed = parseWorkoutInput(input, getKstToday(now()));
    if (!parsed.ok) return parsed;
    const value = parsed.input;
    const data = read();
    const previous = value.id ? data.workouts.find((row) => row.id === value.id) : undefined;
    if (value.id && (!previous || previous.user_id !== DEMO_USER.id)) return failure("workout_not_found");
    if (value.crewId !== null && value.crewId !== DEMO_CREW.id) return failure("invalid_crew");
    if (
      value.companionIds.some((id) => id === DEMO_USER.id || !DEMO_CREW.members.some((member) => member.userId === id))
    )
      return failure("invalid_companion");
    const id = previous?.id ?? crypto.randomUUID();
    const row: WorkoutDetailRow = {
      id,
      kind: value.kind,
      workout_date: value.workoutDate,
      title: value.title,
      memo: value.memo,
      place_name: value.placeName,
      duration_seconds: value.durationSeconds,
      created_at: previous?.created_at ?? now().toISOString(),
      user_id: DEMO_USER.id,
      author: { ...DEMO_USER },
      crew: value.crewId ? { id: DEMO_CREW.id, name: DEMO_CREW.name } : null,
      companions: value.companionIds.map((id) => ({
        profile: { id, nickname: DEMO_CREW.members.find((member) => member.userId === id)?.nickname ?? "친구" },
      })),
      run: value.run
        ? { distance_meters: value.run.distanceMeters, duration_seconds: value.run.durationSeconds }
        : null,
      sets: value.exercises.flatMap((exercise, exerciseOrder) =>
        exercise.sets.map((set, setOrder) => ({
          exercise_name: exercise.name,
          exercise_order: exerciseOrder,
          set_order: setOrder,
          weight_kg: set.weightKg,
          reps: set.reps,
        })),
      ),
      comments: [],
    };
    data.workouts = [...data.workouts.filter((workout) => workout.id !== id), row];
    persist();
    return { ok: true, id };
  };
  const deleteWorkout = async (id: string): Promise<DeleteWorkoutResult> => {
    const data = read();
    if (!data.workouts.some((row) => row.id === id && row.user_id === DEMO_USER.id))
      return failure("workout_not_found");
    data.workouts = data.workouts.filter((row) => row.id !== id);
    delete data.comments[id];
    persist();
    return { ok: true };
  };
  const createComment = async (_state: CommentFormState, formData: FormData): Promise<CommentFormState> => {
    const workoutId = formData.get("workoutId");
    const body = formData.get("body");
    if (!isUuid(workoutId) || !read().workouts.some((row) => row.id === workoutId))
      return { error: "운동 기록을 다시 확인해 주세요.", success: false };
    const error = validateCommentBody(body);
    if (error || typeof body !== "string") return { error, success: false };
    const data = read();
    const comment: WorkoutComment = {
      id: crypto.randomUUID(),
      userId: DEMO_USER.id,
      nickname: DEMO_USER.nickname,
      body: body.trim(),
      createdAt: now().toISOString(),
      isMine: true,
    };
    data.comments[workoutId] = [...(data.comments[workoutId] ?? []), comment];
    persist();
    return { error: null, success: true };
  };
  const deleteComment = async (_state: CommentFormState, formData: FormData): Promise<CommentFormState> => {
    const workoutId = formData.get("workoutId");
    const commentId = formData.get("commentId");
    if (!isUuid(workoutId) || !isUuid(commentId)) return { error: "댓글을 다시 확인해 주세요.", success: false };
    const data = read();
    const comments = data.comments[workoutId];
    if (!comments?.some((comment) => comment.id === commentId && comment.userId === DEMO_USER.id))
      return { error: "댓글을 삭제하지 못했어요. 내 댓글인지 확인해 주세요.", success: false };
    data.comments[workoutId] = comments.filter((comment) => comment.id !== commentId);
    persist();
    return { error: null, success: true };
  };
  const reset = (): void => {
    read();
    state = createSampleData(now());
    persist();
  };

  return {
    getWorkoutPage,
    getWorkoutDetail,
    getWeeklySummary,
    getMyCrews,
    getCrew,
    getWorkoutFormCrews,
    getWorkoutComments,
    saveWorkout,
    deleteWorkout,
    createComment,
    deleteComment,
    reset,
  };
};

export type DemoStore = ReturnType<typeof createDemoStore>;

// 브라우저에서 첫 호출 때만 초기화한다. 테스트와 독립 세션은 팩터리를 사용한다.
export const {
  getWorkoutPage,
  getWorkoutDetail,
  getWeeklySummary,
  getMyCrews,
  getCrew,
  getWorkoutFormCrews,
  getWorkoutComments,
  saveWorkout,
  deleteWorkout,
  createComment,
  deleteComment,
  reset,
} = createDemoStore();
