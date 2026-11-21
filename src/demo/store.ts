import type { CrewDetail, CrewSummary } from "@/entities/crew/model/crew";
import { buildStrengthRecords } from "@/entities/exercise/model/build-strength-records";
import { ROUTINE_LIMITS, type Routine, type RoutineInput } from "@/entities/routine/model/routine";
import type {
  WeeklySummary,
  WorkoutDetail,
  WorkoutInput,
  WorkoutListFilter,
  WorkoutPage,
} from "@/entities/workout/model/contracts";
import {
  getRecentStrengthRange,
  RECENT_STRENGTH_LIMIT,
  type RecentStrengthWorkout,
} from "@/entities/workout/model/recent-strength";
import { buildRunningStats, type RunningStats } from "@/entities/workout/model/running-stats";
import { addDays, buildWeeklySummary, getKstToday, getWeekStart } from "@/entities/workout/model/weekly-summary";
import { decodeWorkoutCursor, encodeWorkoutCursor, type WorkoutCursor } from "@/entities/workout/model/workout-cursor";
import {
  toExercises,
  toWorkoutDetail,
  toWorkoutListItem,
  type WorkoutDetailRow,
} from "@/entities/workout/model/workout-mappers";
import type { DeleteRoutineResult, SaveRoutineResult } from "@/features/workout/api/routine-actions";
import type { DeleteWorkoutResult, SaveWorkoutResult } from "@/features/workout/api/workout-actions";
import { getRoutineErrorMessage, parseRoutineInput } from "@/features/workout/model/routine-form";
import { getWorkoutErrorMessage, isUuid, parseWorkoutInput } from "@/features/workout/model/save-workout-input";
import type { WorkoutComment } from "@/features/workout-comment/model/comment";
import { type CommentFormState, validateCommentBody } from "@/features/workout-comment/model/comment-form";
import {
  compareComments,
  decodeCommentCursor,
  type OlderCommentsResult,
  sliceComments,
  type WorkoutCommentPage,
} from "@/features/workout-comment/model/comment-page";
import { toWorkoutFormCrews } from "@/widgets/workout-form/model/crews";
import type { WorkoutFormCrew } from "@/widgets/workout-form/model/types";

import { createSampleData, createSampleRoutines, DEMO_CREW, DEMO_USER, type DemoState } from "./sample-data";

export const DEMO_STORAGE_KEY = "sweat-log:demo:v1";
export type DemoHomeData = {
  // 집계 기준일(KST, YYYY-MM-DD)
  today: string;
  summary: WeeklySummary;
  runningStats: RunningStats;
  strengthRecords: ReturnType<typeof buildStrengthRecords>;
};
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
  // 루틴이 생기기 전에 저장된 세션은 기록을 그대로 두고 샘플 루틴만 채운다.
  if (state.routines === undefined) state.routines = createSampleRoutines();
  if (!Array.isArray(state.routines) || state.routines.length > ROUTINE_LIMITS.perUser) return null;
  const routineIds = new Set<string>();
  for (const routine of state.routines) {
    if (
      !routine ||
      !isUuid(routine.id) ||
      routineIds.has(routine.id) ||
      typeof routine.updatedAt !== "string" ||
      Number.isNaN(Date.parse(routine.updatedAt)) ||
      !parseRoutineInput({ name: routine.name, exercises: routine.exercises }).ok
    )
      return null;
    routineIds.add(routine.id);
  }
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
  const readWeeklySummary = (today: string): WeeklySummary => {
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
  // 실제 앱의 DB 함수와 같은 범위(내가 쓰거나 함께한 러닝)를 같은 순수 함수 규칙으로 집계한다.
  const readRunningStats = (today: string): RunningStats => {
    const mine = read().workouts.filter(
      (row) => row.user_id === DEMO_USER.id || row.companions.some(({ profile }) => profile?.id === DEMO_USER.id),
    );
    return buildRunningStats({
      today,
      hasWorkouts: mine.length > 0,
      runs: mine.flatMap((row) =>
        row.kind === "run" && row.run
          ? [
              {
                workoutId: row.id,
                workoutDate: row.workout_date,
                createdAt: row.created_at,
                distanceMeters: row.run.distance_meters,
                durationSeconds: row.run.duration_seconds,
              },
            ]
          : [],
      ),
    });
  };
  const readStrengthRecords = (today: string) =>
    buildStrengthRecords(
      read()
        .workouts.filter(
          (row) =>
            row.kind === "strength" &&
            (row.user_id === DEMO_USER.id || row.companions.some(({ profile }) => profile?.id === DEMO_USER.id)),
        )
        .map((row) => ({
          workoutId: row.id,
          workoutDate: row.workout_date,
          createdAt: row.created_at,
          sets: row.sets.map((set) => ({ name: set.exercise_name, weightKg: set.weight_kg })),
        })),
      today,
    );
  const getWeeklySummary = async (today = getKstToday(now())) => readWeeklySummary(today);
  const getRunningStats = async (today = getKstToday(now())) => readRunningStats(today);
  const getStrengthRecords = async (today = getKstToday(now())) => readStrengthRecords(today);
  /**
   * 홈 화면 세 카드를 한 번에 동기로 읽는다. 저장소가 메모리라 기다릴 것이 없다.
   * 서버는 미리 그릴 샘플 홈을, 브라우저는 첫 프레임부터 비지 않는 홈을 이걸로 만든다.
   */
  const readHome = (today = getKstToday(now())): DemoHomeData => ({
    today,
    summary: readWeeklySummary(today),
    runningStats: readRunningStats(today),
    strengthRecords: readStrengthRecords(today),
  });
  const getMyCrews = async (): Promise<CrewSummary[]> => [
    { id: DEMO_CREW.id, name: DEMO_CREW.name, memberCount: DEMO_CREW.members.length },
  ];
  const getCrew = async (id: string): Promise<CrewDetail | null> =>
    id === DEMO_CREW.id ? structuredClone(DEMO_CREW) : null;
  const getWorkoutFormCrews = async (currentUserId: string = DEMO_USER.id): Promise<WorkoutFormCrew[]> =>
    toWorkoutFormCrews([DEMO_CREW], currentUserId);
  // 실제 앱처럼 최신 묶음과 전체 개수를 따로 주고, 이전 댓글은 커서로 이어서 준다.
  const readComments = (workoutId: string): WorkoutComment[] =>
    structuredClone(read().comments[workoutId] ?? [])
      .map((comment) => ({ ...comment, isMine: comment.userId === DEMO_USER.id }))
      .sort(compareComments);
  const getWorkoutComments = async (workoutId: string): Promise<WorkoutCommentPage> => {
    if (!isUuid(workoutId)) return { comments: [], olderCursor: null, total: 0 };
    const comments = readComments(workoutId);
    return { ...sliceComments(comments, null), total: comments.length };
  };
  const loadOlderComments = async (workoutId: string, cursor: string): Promise<OlderCommentsResult> => {
    const decoded = decodeCommentCursor(cursor);
    if (!isUuid(workoutId) || !decoded) return { ok: false };
    return { ok: true, ...sliceComments(readComments(workoutId), decoded) };
  };

  const saveWorkout = async (input: WorkoutInput): Promise<SaveWorkoutResult> => {
    const parsed = parseWorkoutInput(input, getKstToday(now()));
    if (!parsed.ok) return parsed;
    const value = parsed.input;
    const data = read();
    const previous = value.id ? data.workouts.find((row) => row.id === value.id) : undefined;
    if (value.id && (!previous || previous.user_id !== DEMO_USER.id)) return failure("workout_not_found");
    if (value.crewId !== null && value.crewId !== DEMO_CREW.id) return failure("invalid_crew");
    const companionIds = value.companionIds.filter((id) => id !== DEMO_USER.id);
    if (companionIds.some((id) => !DEMO_CREW.members.some((member) => member.userId === id)))
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
      companions: companionIds.map((id) => ({
        user_id: id,
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
    if (!isUuid(workoutId)) return { error: "운동 기록을 다시 확인해 주세요.", success: false };
    const error = validateCommentBody(body);
    if (error || typeof body !== "string") return { error, success: false };
    const data = read();
    if (
      !data.workouts.some(
        (row) =>
          row.id === workoutId &&
          (row.user_id === DEMO_USER.id ||
            row.companions.some(({ profile }) => profile?.id === DEMO_USER.id) ||
            row.crew?.id === DEMO_CREW.id),
      )
    )
      return { error: "댓글을 작성하지 못했어요. 기록을 볼 수 있는지 확인하고 다시 시도해 주세요.", success: false };
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
  // 실제 앱처럼 최근에 고친 것부터. 루틴은 내 것만 있다.
  const getRoutines = async (): Promise<Routine[]> =>
    structuredClone(read().routines).sort((a, b) => compare(b.updatedAt, a.updatedAt) || compare(a.id, b.id));
  const getRoutine = async (id: string): Promise<Routine | null> =>
    structuredClone(read().routines.find((routine) => routine.id === id) ?? null);
  const saveRoutine = async (input: RoutineInput): Promise<SaveRoutineResult> => {
    const parsed = parseRoutineInput(input);
    if (!parsed.ok) return parsed;
    const data = read();
    const { id, name, exercises } = parsed.input;
    if (id && !data.routines.some((routine) => routine.id === id))
      return { ok: false, error: getRoutineErrorMessage({ message: "routine_not_found" }) };
    if (!id && data.routines.length >= ROUTINE_LIMITS.perUser)
      return { ok: false, error: getRoutineErrorMessage({ message: "too_many_routines" }) };
    const routine: Routine = { id: id ?? crypto.randomUUID(), name, exercises, updatedAt: now().toISOString() };
    data.routines = [...data.routines.filter((item) => item.id !== routine.id), routine];
    persist();
    return { ok: true, id: routine.id };
  };
  const deleteRoutine = async (id: string): Promise<DeleteRoutineResult> => {
    const data = read();
    if (!data.routines.some((routine) => routine.id === id))
      return { ok: false, error: getRoutineErrorMessage({ message: "routine_not_found" }) };
    data.routines = data.routines.filter((routine) => routine.id !== id);
    persist();
    return { ok: true };
  };
  // 최근 기록 불러오기. 실제 앱처럼 오늘 포함 7일 안의 내가 쓴 헬스 기록만, 최근 것부터.
  const getRecentStrengthWorkouts = async ({
    today = getKstToday(now()),
    excludeId,
  }: {
    today?: string;
    excludeId?: string;
  } = {}): Promise<RecentStrengthWorkout[]> => {
    const { from, to } = getRecentStrengthRange(today);
    return structuredClone(
      read()
        .workouts.filter(
          (row) =>
            row.user_id === DEMO_USER.id &&
            row.kind === "strength" &&
            row.id !== excludeId &&
            row.workout_date >= from &&
            row.workout_date <= to,
        )
        .sort((a, b) => compareCursor(cursorOf(b), cursorOf(a)))
        .flatMap((row) => {
          const exercises = toExercises(row.sets);
          return exercises.length > 0
            ? [{ id: row.id, workoutDate: row.workout_date, title: row.title, exercises }]
            : [];
        })
        .slice(0, RECENT_STRENGTH_LIMIT),
    );
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
    getRunningStats,
    getStrengthRecords,
    readHome,
    getMyCrews,
    getCrew,
    getWorkoutFormCrews,
    getWorkoutComments,
    loadOlderComments,
    saveWorkout,
    deleteWorkout,
    createComment,
    deleteComment,
    getRoutines,
    getRoutine,
    saveRoutine,
    deleteRoutine,
    getRecentStrengthWorkouts,
    reset,
  };
};

export type DemoStore = ReturnType<typeof createDemoStore>;

// 공유 인스턴스는 서버 요청 사이에 상태가 섞이지 않도록 호출 시점에 차단한다.
const sharedStore = createDemoStore();
const assertBrowser = () => {
  if (typeof window === "undefined") {
    throw new Error(
      "데모 공유 저장소는 브라우저에서만 사용할 수 있어요. 서버 테스트에서는 createDemoStore({ storage: () => null })을 사용하세요.",
    );
  }
};
const browserOnly =
  <Args extends unknown[], Result>(action: (...args: Args) => Promise<Result>) =>
  async (...args: Args): Promise<Result> => {
    assertBrowser();
    return action(...args);
  };

export const getWorkoutPage = browserOnly(sharedStore.getWorkoutPage);
export const getWorkoutDetail = browserOnly(sharedStore.getWorkoutDetail);
export const readHome = (): DemoHomeData => {
  assertBrowser();
  return sharedStore.readHome();
};
export const getMyCrews = browserOnly(sharedStore.getMyCrews);
export const getCrew = browserOnly(sharedStore.getCrew);
export const getWorkoutFormCrews = browserOnly(sharedStore.getWorkoutFormCrews);
export const getWorkoutComments = browserOnly(sharedStore.getWorkoutComments);
export const loadOlderComments = browserOnly(sharedStore.loadOlderComments);
export const saveWorkout = browserOnly(sharedStore.saveWorkout);
export const deleteWorkout = browserOnly(sharedStore.deleteWorkout);
export const createComment = browserOnly(sharedStore.createComment);
export const deleteComment = browserOnly(sharedStore.deleteComment);
export const getRoutines = browserOnly(sharedStore.getRoutines);
export const getRoutine = browserOnly(sharedStore.getRoutine);
export const saveRoutine = browserOnly(sharedStore.saveRoutine);
export const deleteRoutine = browserOnly(sharedStore.deleteRoutine);
export const getRecentStrengthWorkouts = browserOnly(sharedStore.getRecentStrengthWorkouts);
export const reset = (): void => {
  assertBrowser();
  sharedStore.reset();
};
