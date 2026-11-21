/**
 * 체험용 내 종목 저장소. 실제 user_exercises와 Server Action(saveUserExercise 등)을 대신한다.
 * 기록·루틴 저장소(store.ts)와 따로 sessionStorage 키를 써서, 그 파일의 상태 모양을 바꾸지 않는다.
 * "기록에만 있는 종목"은 store.ts의 조회 함수로 내 헬스 기록을 읽어 실제 get_my_exercise_names와 같은 규칙으로 묶는다.
 */
import { normalizeExerciseName } from "@/entities/exercise/model/search-exercises";
import {
  type DeleteUserExerciseResult,
  findDuplicateExercise,
  getUserExerciseErrorMessage,
  isExerciseBodyPart,
  isUserExerciseId,
  parseUserExerciseInput,
  type RecordedExerciseName,
  type SaveUserExerciseResult,
  sortUserExercises,
  USER_EXERCISE_LIMITS,
  type UserExercise,
  type UserExerciseInput,
} from "@/entities/exercise/model/user-exercise";
import type { WorkoutDetail, WorkoutListFilter, WorkoutPage } from "@/entities/workout/model/contracts";

import { DEMO_USER } from "./sample-data";
import type { DemoStorage } from "./store";
import * as store from "./store";

export const DEMO_USER_EXERCISES_KEY = "sweat-log:demo:user-exercises:v1";

// 추천과 관리 화면을 바로 해 볼 수 있게 하나를 넣어 둔다.
export const createSampleUserExercises = (): UserExercise[] => [
  { bodyPart: "팔", bodyweight: false, id: "70000000-0000-4000-8000-000000000001", name: "케이블 킥백" },
];

type WorkoutReader = {
  getWorkoutPage: (filter?: WorkoutListFilter) => Promise<WorkoutPage>;
  getWorkoutDetail: (id: string) => Promise<WorkoutDetail | null>;
};

export type DemoUserExerciseStoreOptions = {
  storage?: () => DemoStorage | null;
  workouts?: WorkoutReader;
};

const isUserExercise = (value: unknown): value is UserExercise => {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    isUserExerciseId(item.id) &&
    typeof item.name === "string" &&
    isExerciseBodyPart(item.bodyPart) &&
    typeof item.bodyweight === "boolean" &&
    parseUserExerciseInput({ bodyPart: item.bodyPart, bodyweight: item.bodyweight, name: item.name }).ok
  );
};

const restore = (raw: string): UserExercise[] | null => {
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > USER_EXERCISE_LIMITS.perUser || !value.every(isUserExercise)) return null;
  return value;
};

const browserStorage = (): DemoStorage | null => (typeof window === "undefined" ? null : window.sessionStorage);

export const createDemoUserExerciseStore = ({
  storage = browserStorage,
  workouts = store,
}: DemoUserExerciseStoreOptions = {}) => {
  let state: UserExercise[] | undefined;
  let persistence: DemoStorage | null | undefined;
  const persist = () => {
    try {
      persistence?.setItem(DEMO_USER_EXERCISES_KEY, JSON.stringify(state));
    } catch {
      persistence = null;
    }
  };
  const read = (): UserExercise[] => {
    if (persistence === undefined) {
      try {
        persistence = storage();
        const raw = persistence?.getItem(DEMO_USER_EXERCISES_KEY);
        if (raw) state = restore(raw) ?? undefined;
      } catch {
        persistence ??= null;
        state = undefined;
      }
    }
    if (!state) {
      state = createSampleUserExercises();
      persist();
    }
    return state;
  };

  const getUserExercises = async (): Promise<UserExercise[]> => sortUserExercises(structuredClone(read()));

  // 실제 saveUserExercise와 같은 순서로 본다: 입력 → 이름 중복(사전·내 다른 종목) → 상한
  const saveUserExercise = async (input: UserExerciseInput): Promise<SaveUserExerciseResult> => {
    const parsed = parseUserExerciseInput(input);
    if (!parsed.ok) return parsed;
    const current = read();
    const { id, name, bodyPart, bodyweight } = parsed.input;
    if (id && !current.some((exercise) => exercise.id === id))
      return { error: getUserExerciseErrorMessage({ message: "exercise_not_found" }), ok: false };
    const duplicate = findDuplicateExercise(name, current, id);
    if (duplicate) return { duplicate, error: "같은 이름의 종목이 이미 있어요.", ok: false };
    if (!id && current.length >= USER_EXERCISE_LIMITS.perUser)
      return { error: getUserExerciseErrorMessage({ message: "too_many_exercises" }), ok: false };
    const exercise: UserExercise = { bodyPart, bodyweight, id: id ?? crypto.randomUUID(), name };
    state = id ? current.map((item) => (item.id === id ? exercise : item)) : [...current, exercise];
    persist();
    return { exercise: structuredClone(exercise), ok: true };
  };

  const deleteUserExercise = async (id: string): Promise<DeleteUserExerciseResult> => {
    const current = read();
    if (!current.some((exercise) => exercise.id === id))
      return { error: getUserExerciseErrorMessage({ message: "exercise_not_found" }), ok: false };
    state = current.filter((exercise) => exercise.id !== id);
    persist();
    return { ok: true };
  };

  // 내가 쓴 헬스 기록만(동행으로 붙은 기록 제외). 표시 이름은 가장 최근 기록의 이름, 많이 쓴 것부터.
  const getRecordedExerciseNames = async (): Promise<RecordedExerciseName[]> => {
    const mine: WorkoutDetail[] = [];
    let cursor: string | undefined;
    do {
      const page = await workouts.getWorkoutPage({ cursor, kind: "strength" });
      for (const item of page.items) {
        if (item.author.id !== DEMO_USER.id) continue;
        const detail = await workouts.getWorkoutDetail(item.id);
        if (detail) mine.push(detail);
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    // 목록은 최신순이라 처음 본 이름이 가장 최근 이름이다.
    const groups = new Map<string, { name: string; workoutIds: Set<string>; latest: string }>();
    for (const workout of mine) {
      for (const exercise of workout.exercises) {
        const key = normalizeExerciseName(exercise.name);
        if (!key) continue;
        const group = groups.get(key) ?? {
          latest: workout.workoutDate,
          name: exercise.name.trim(),
          workoutIds: new Set(),
        };
        group.workoutIds.add(workout.id);
        groups.set(key, group);
      }
    }
    return [...groups.values()]
      .sort(
        (left, right) =>
          right.workoutIds.size - left.workoutIds.size ||
          (left.latest < right.latest ? 1 : left.latest > right.latest ? -1 : 0) ||
          (left.name < right.name ? -1 : 1),
      )
      .map((group) => ({ name: group.name, workoutCount: group.workoutIds.size }));
  };

  const reset = (): void => {
    read();
    state = createSampleUserExercises();
    persist();
  };

  return { deleteUserExercise, getRecordedExerciseNames, getUserExercises, reset, saveUserExercise };
};

export type DemoUserExerciseStore = ReturnType<typeof createDemoUserExerciseStore>;

// store.ts의 공유 인스턴스처럼 서버에서 부르면 막는다.
const shared = createDemoUserExerciseStore();
const browserOnly =
  <Args extends unknown[], Result>(action: (...args: Args) => Promise<Result>) =>
  async (...args: Args): Promise<Result> => {
    if (typeof window === "undefined") throw new Error("데모 내 종목 저장소는 브라우저에서만 사용할 수 있어요.");
    return action(...args);
  };

export const getUserExercises = browserOnly(shared.getUserExercises);
export const saveUserExercise = browserOnly(shared.saveUserExercise);
export const deleteUserExercise = browserOnly(shared.deleteUserExercise);
export const getRecordedExerciseNames = browserOnly(shared.getRecordedExerciseNames);
export const resetUserExercises = (): void => {
  if (typeof window === "undefined") throw new Error("데모 내 종목 저장소는 브라우저에서만 사용할 수 있어요.");
  shared.reset();
};
