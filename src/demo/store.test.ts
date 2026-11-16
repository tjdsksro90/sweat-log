import { describe, expect, it, vi } from "vitest";

import type { WorkoutInput, WorkoutListItem } from "@/entities/workout/model/contracts";
import { addDays, getKstToday } from "@/entities/workout/model/weekly-summary";
import { encodeWorkoutCursor } from "@/entities/workout/model/workout-cursor";
import { INITIAL_COMMENT_FORM_STATE } from "@/features/workout-comment/model/comment-form";

import { createSampleData, DEMO_CREW, DEMO_USER } from "./sample-data";
import { createDemoStore, DEMO_STORAGE_KEY, type DemoStorage, type DemoStore } from "./store";

const NOW = new Date("2026-11-16T00:00:00Z");
const TODAY = getKstToday(NOW);
const makeStore = () => createDemoStore({ now: () => NOW, storage: () => null });
const input = (override: Partial<WorkoutInput> = {}): WorkoutInput => ({
  kind: "run",
  workoutDate: TODAY,
  title: "새 러닝",
  memo: "즐거웠다",
  placeName: "공원",
  crewId: DEMO_CREW.id,
  companionIds: [DEMO_CREW.members[1].userId],
  durationSeconds: null,
  run: { distanceMeters: 3000, durationSeconds: 1200 },
  exercises: [],
  ...override,
});
const memoryStorage = (): DemoStorage => {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
};
const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const allItems = async (store: DemoStore, crewId?: string) => {
  const items: WorkoutListItem[] = [];
  let cursor: string | undefined;
  do {
    const page = await store.getWorkoutPage({ crewId, cursor });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return items;
};

describe("데모 조회와 페이지", () => {
  it("내 기록·동행 기록과 크루 피드를 구분하고 요약은 내 기록만 센다", async () => {
    const store = makeStore();
    const mine = await allItems(store);
    const crew = await allItems(store, DEMO_CREW.id);
    expect(crew.length).toBe(mine.length + 2);
    expect(mine.filter((row) => row.author.id !== DEMO_USER.id)).toHaveLength(1);
    expect(await store.getWeeklySummary()).toEqual({
      weekStart: TODAY,
      workoutCount: 1,
      runDistanceMeters: 5000,
      strengthVolumeKg: 0,
      streakDays: 5,
      activeDates: [TODAY],
    });
    expect(await store.getWorkoutDetail("없는 기록")).toBeNull();
    expect((await store.getWorkoutPage({ crewId: "없는 크루" })).items).toEqual([]);
    expect(await store.getWorkoutComments("없는 기록")).toEqual([]);
  });

  it.each(Array.from({ length: 7 }, (_, day) => day))("요일 %s에도 이번 주와 연속 기록이 채워진다", async (day) => {
    const store = createDemoStore({ now: () => new Date(`${addDays(TODAY, day)}T00:00:00Z`), storage: () => null });
    const summary = await store.getWeeklySummary();
    expect(summary.workoutCount).toBeGreaterThan(0);
    expect(summary.runDistanceMeters).toBeGreaterThan(0);
    expect(summary.streakDays).toBe(5);
  });

  it("날짜 경계·종류·크루 필터를 함께 적용한다", async () => {
    const store = makeStore();
    const expected = (await allItems(store, DEMO_CREW.id)).filter(
      (row) => row.workoutDate >= addDays(TODAY, -7) && row.workoutDate <= TODAY && row.kind === "run",
    );
    expect(
      (await store.getWorkoutPage({ crewId: DEMO_CREW.id, from: addDays(TODAY, -7), to: TODAY, kind: "run" })).items,
    ).toEqual(expected);
    expect(
      (await store.getWorkoutPage({ from: TODAY, to: TODAY })).items.every((row) => row.workoutDate === TODAY),
    ).toBe(true);
    expect((await store.getWorkoutPage({ from: TODAY, to: addDays(TODAY, -1) })).items).toEqual([]);
  });

  it("20개씩 날짜·작성 시각·ID 내림차순으로 중복이나 누락 없이 넘긴다", async () => {
    const store = makeStore();
    for (let index = 0; index < 25; index++) expect((await store.saveWorkout(input())).ok).toBe(true);
    const first = await store.getWorkoutPage();
    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).not.toBeNull();
    const items = await allItems(store);
    expect(items).toHaveLength(
      createSampleData(NOW).workouts.filter(
        (row) => row.user_id === DEMO_USER.id || row.companions.some(({ profile }) => profile?.id === DEMO_USER.id),
      ).length + 25,
    );
    expect(new Set(items.map((row) => row.id)).size).toBe(items.length);
    const sameTime = items.filter((row) => row.title === "새 러닝").map((row) => row.id);
    expect(sameTime).toEqual([...sameTime].sort().reverse());
    expect(await store.getWorkoutPage({ cursor: "깨진 커서" })).toEqual(first);
    const last = await store.getWorkoutDetail(items.at(-1)?.id ?? "");
    expect(last).not.toBeNull();
    if (last)
      expect(await store.getWorkoutPage({ cursor: encodeWorkoutCursor(last) })).toEqual({
        items: [],
        nextCursor: null,
      });
  });

  it("크루와 폼 목록은 같은 구성원을 반환하고 외부 수정을 저장소에 반영하지 않는다", async () => {
    const store = makeStore();
    expect(await store.getMyCrews()).toEqual([{ id: DEMO_CREW.id, name: DEMO_CREW.name, memberCount: 4 }]);
    expect(await store.getCrew("unknown")).toBeNull();
    const crew = await store.getCrew(DEMO_CREW.id);
    crew?.members.pop();
    expect((await store.getCrew(DEMO_CREW.id))?.members).toHaveLength(4);
    expect((await store.getWorkoutFormCrews(DEMO_USER.id))[0].members).toHaveLength(3);
    expect(
      (await store.getWorkoutFormCrews(DEMO_USER.id))[0].members.some((member) => member.userId === DEMO_USER.id),
    ).toBe(false);
    const row = (await store.getWorkoutPage()).items[0];
    row.author.nickname = "바꿈";
    expect((await store.getWorkoutDetail(row.id))?.author.nickname).not.toBe("바꿈");
    const detail = await store.getWorkoutDetail(row.id);
    if (detail?.run) detail.run.distanceMeters = 99;
    expect((await store.getWorkoutDetail(row.id))?.run?.distanceMeters).not.toBe(99);
  });
});

describe("기록과 댓글 변경", () => {
  it("작성 → 종류·날짜·공유 수정 → 삭제를 목록·상세·요약에 반영한다", async () => {
    const store = makeStore();
    const baseline = await store.getWeeklySummary();
    const saved = await store.saveWorkout(input());
    if (!saved.ok) throw new Error(saved.error);
    expect((await store.getWorkoutDetail(saved.id))?.run?.distanceMeters).toBe(3000);
    expect((await store.getWorkoutPage()).items.some((row) => row.id === saved.id)).toBe(true);
    expect((await store.getWeeklySummary()).runDistanceMeters).toBe(baseline.runDistanceMeters + 3000);
    const createdAt = (await store.getWorkoutDetail(saved.id))?.createdAt;
    expect(
      await store.saveWorkout(
        input({
          id: saved.id,
          kind: "strength",
          run: null,
          durationSeconds: 2400,
          exercises: [
            {
              name: "스쿼트",
              sets: [
                { weightKg: 20.33, reps: 3 },
                { weightKg: null, reps: 10 },
              ],
            },
          ],
          crewId: null,
          companionIds: [],
        }),
      ),
    ).toEqual({ ok: true, id: saved.id });
    expect(await store.getWorkoutDetail(saved.id)).toMatchObject({ run: null, createdAt, isMine: true, crew: null });
    expect((await store.getWorkoutPage()).items.find((row) => row.id === saved.id)?.strengthSummary).toEqual({
      exerciseCount: 1,
      setCount: 2,
      totalVolumeKg: 60.99,
    });
    expect(await store.getWeeklySummary()).toMatchObject({
      workoutCount: baseline.workoutCount + 1,
      runDistanceMeters: baseline.runDistanceMeters,
      strengthVolumeKg: 60.99,
    });
    expect((await store.getWorkoutPage({ crewId: DEMO_CREW.id })).items.some((row) => row.id === saved.id)).toBe(false);
    await store.saveWorkout(input({ id: saved.id, workoutDate: addDays(TODAY, -10) }));
    expect(await store.getWeeklySummary()).toEqual(baseline);
    await store.createComment(INITIAL_COMMENT_FORM_STATE, form({ workoutId: saved.id, body: "내 댓글" }));
    expect(await store.deleteWorkout(saved.id)).toEqual({ ok: true });
    expect(await store.getWorkoutDetail(saved.id)).toBeNull();
    expect((await allItems(store)).some((row) => row.id === saved.id)).toBe(false);
    expect(await store.getWorkoutComments(saved.id)).toEqual([]);
    expect(await store.getWeeklySummary()).toEqual(baseline);
  });

  it("중복 날짜는 하루로 세고 오늘 기록이 없으면 어제부터 센다", async () => {
    const store = makeStore();
    const today = (await store.getWorkoutPage({ from: TODAY, to: TODAY })).items.find(
      (row) => row.author.id === DEMO_USER.id,
    );
    expect(today).toBeDefined();
    await store.deleteWorkout(today?.id ?? "");
    expect((await store.getWeeklySummary()).streakDays).toBe(4);
    await store.saveWorkout(input({ workoutDate: addDays(TODAY, -1) }));
    expect((await store.getWeeklySummary()).streakDays).toBe(4);
    expect((await store.getWeeklySummary(addDays(TODAY, 1))).streakDays).toBe(0);
  });

  it("잘못된 입력과 다른 작성자의 수정·삭제를 거부하고 상태를 유지한다", async () => {
    const store = makeStore();
    const before = await allItems(store, DEMO_CREW.id);
    const friend = before.find((row) => row.author.id !== DEMO_USER.id);
    expect(friend).toBeDefined();
    for (const bad of [
      input({ workoutDate: addDays(TODAY, 1) }),
      input({ run: null }),
      input({ id: friend?.id }),
      input({ crewId: "20000000-0000-4000-8000-000000000099" }),
      input({ companionIds: ["10000000-0000-4000-8000-000000000099"] }),
    ]) {
      expect((await store.saveWorkout(bad)).ok).toBe(false);
    }
    expect((await store.deleteWorkout(friend?.id ?? "")).ok).toBe(false);
    expect((await store.deleteWorkout("unknown")).ok).toBe(false);
    expect(await allItems(store, DEMO_CREW.id)).toEqual(before);
  });

  it("동행자에 내가 있으면 제외하고 친구만 저장한다", async () => {
    const store = makeStore();
    const saved = await store.saveWorkout(input({ companionIds: [DEMO_USER.id] }));
    if (!saved.ok) throw new Error(saved.error);
    expect((await store.getWorkoutDetail(saved.id))?.companions).toEqual([]);
    expect(
      await store.saveWorkout(input({ id: saved.id, companionIds: [DEMO_USER.id, DEMO_CREW.members[1].userId] })),
    ).toEqual({ ok: true, id: saved.id });
    expect((await store.getWorkoutDetail(saved.id))?.companions.map((person) => person.id)).toEqual([
      DEMO_CREW.members[1].userId,
    ]);
  });

  it("댓글은 UUID, 본문, 기록 접근 순서로 검증한다", async () => {
    const store = makeStore();
    const missingId = "30000000-0000-4000-8000-000000000099";
    const create = (workoutId: string, body: string) =>
      store.createComment(INITIAL_COMMENT_FORM_STATE, form({ workoutId, body }));
    expect(await create("invalid", "")).toEqual({ success: false, error: "운동 기록을 다시 확인해 주세요." });
    expect(await create(missingId, "")).toEqual({ success: false, error: "댓글은 1~500자로 적어 주세요." });
    expect(await create(missingId, "응원해요")).toEqual({
      success: false,
      error: "댓글을 작성하지 못했어요. 기록을 볼 수 있는지 확인하고 다시 시도해 주세요.",
    });
    expect(await store.getWorkoutComments(missingId)).toEqual([]);
  });

  it("열람할 수 없는 기록에는 댓글을 작성하지 않는다", async () => {
    const sample = createSampleData(NOW);
    const hidden = sample.workouts.find((row) => row.user_id !== DEMO_USER.id && row.companions.length === 0);
    if (!hidden) throw new Error("친구 기록 없음");
    hidden.crew = null;
    const storage = memoryStorage();
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(sample));
    const store = createDemoStore({ now: () => NOW, storage: () => storage });
    expect(
      await store.createComment(INITIAL_COMMENT_FORM_STATE, form({ workoutId: hidden.id, body: "응원해요" })),
    ).toEqual({ success: false, error: "댓글을 작성하지 못했어요. 기록을 볼 수 있는지 확인하고 다시 시도해 주세요." });
    expect(await store.getWorkoutComments(hidden.id)).toEqual([]);
  });

  it("댓글 작성·삭제 시 개수를 갱신하고 남의 댓글 삭제와 잘못된 입력을 거부한다", async () => {
    const store = makeStore();
    const workout = (await store.getWorkoutPage()).items.find((row) => row.commentCount > 0);
    if (!workout) throw new Error("샘플 댓글 없음");
    const original = await store.getWorkoutComments(workout.id);
    expect(
      (await store.createComment(INITIAL_COMMENT_FORM_STATE, form({ workoutId: workout.id, body: "  좋아요!  " })))
        .success,
    ).toBe(true);
    const comments = await store.getWorkoutComments(workout.id);
    const mine = comments.find((comment) => comment.isMine);
    expect(mine?.body).toBe("좋아요!");
    expect((await store.getWorkoutDetail(workout.id))?.commentCount).toBe(original.length + 1);
    expect((await store.getWorkoutPage()).items.find((row) => row.id === workout.id)?.commentCount).toBe(
      original.length + 1,
    );
    expect(
      (
        await store.deleteComment(
          INITIAL_COMMENT_FORM_STATE,
          form({ workoutId: workout.id, commentId: original[0].id }),
        )
      ).success,
    ).toBe(false);
    expect(
      (await store.deleteComment(INITIAL_COMMENT_FORM_STATE, form({ workoutId: "wrong", commentId: mine?.id ?? "" })))
        .success,
    ).toBe(false);
    for (const body of [" ", "가".repeat(501)])
      expect(
        (await store.createComment(INITIAL_COMMENT_FORM_STATE, form({ workoutId: workout.id, body }))).success,
      ).toBe(false);
    expect(
      (await store.createComment(INITIAL_COMMENT_FORM_STATE, form({ workoutId: "missing", body: "좋아요" }))).success,
    ).toBe(false);
    expect(
      (
        await store.deleteComment(
          INITIAL_COMMENT_FORM_STATE,
          form({ workoutId: workout.id, commentId: mine?.id ?? "" }),
        )
      ).success,
    ).toBe(true);
    expect(await store.getWorkoutComments(workout.id)).toEqual(original);
    expect((await store.getWorkoutDetail(workout.id))?.commentCount).toBe(original.length);
  });
});

describe("세션 저장과 초기화", () => {
  it("재생성 시 같은 저장소를 복원하고 별도 탭 저장소는 분리한다", async () => {
    const storage = memoryStorage();
    const first = createDemoStore({ now: () => NOW, storage: () => storage });
    const saved = await first.saveWorkout(input());
    if (!saved.ok) throw new Error(saved.error);
    await first.createComment(INITIAL_COMMENT_FORM_STATE, form({ workoutId: saved.id, body: "다시 열어도 유지" }));
    const reopened = createDemoStore({ now: () => NOW, storage: () => storage });
    expect(await reopened.getWorkoutDetail(saved.id)).toEqual(await first.getWorkoutDetail(saved.id));
    expect(await reopened.getWorkoutComments(saved.id)).toEqual(await first.getWorkoutComments(saved.id));
    expect(await makeStore().getWorkoutDetail(saved.id)).toBeNull();
  });

  it.each([
    "getter",
    "getItem",
    "setItem",
    "none",
  ])("%s 실패 시에도 메모리에서 변경과 reset이 동작한다", async (mode) => {
    const storage = memoryStorage();
    if (mode === "getItem")
      storage.getItem = () => {
        throw new Error("SecurityError");
      };
    if (mode === "setItem")
      storage.setItem = () => {
        throw new Error("QuotaExceededError");
      };
    const store = createDemoStore({
      now: () => NOW,
      storage: () => {
        if (mode === "getter") throw new Error("SecurityError");
        return mode === "none" ? null : storage;
      },
    });
    const baseline = await store.getWorkoutPage();
    const saved = await store.saveWorkout(input());
    if (!saved.ok) throw new Error(saved.error);
    expect(await store.getWorkoutDetail(saved.id)).not.toBeNull();
    store.reset();
    expect(await store.getWorkoutPage()).toEqual(baseline);
  });

  it.each([
    "{broken",
    "null",
    '{"version":0}',
    '{"version":1,"workouts":[{}],"comments":{}}',
  ])("손상된 저장값은 샘플로 돌아간다: %s", async (raw) => {
    const storage = memoryStorage();
    storage.setItem(DEMO_STORAGE_KEY, raw);
    expect(await createDemoStore({ now: () => NOW, storage: () => storage }).getWorkoutPage()).toEqual(
      await makeStore().getWorkoutPage(),
    );
  });

  it("reset은 실행 시점의 한국 날짜로 재생성하고 저장된 변경도 지운다", async () => {
    const storage = memoryStorage();
    let now = NOW;
    const store = createDemoStore({ now: () => now, storage: () => storage });
    const saved = await store.saveWorkout(input());
    if (!saved.ok) throw new Error(saved.error);
    now = new Date("2027-01-02T15:00:00Z");
    store.reset();
    const reopened = createDemoStore({ now: () => now, storage: () => storage });
    expect(await reopened.getWorkoutDetail(saved.id)).toBeNull();
    expect(await reopened.getWorkoutPage()).toEqual(
      await createDemoStore({ now: () => now, storage: () => null }).getWorkoutPage(),
    );
    expect((await reopened.getWorkoutPage()).items[0].workoutDate).toBe("2027-01-03");
    expect((await reopened.getWeeklySummary()).streakDays).toBe(5);
  });

  it("생성할 때는 storage에 접근하지 않고 첫 데이터 작업에서 초기화한다", async () => {
    const storage = vi.fn(() => null);
    const store = createDemoStore({ storage, now: () => NOW });
    expect(storage).not.toHaveBeenCalled();
    await store.getWorkoutPage();
    expect(storage).toHaveBeenCalledTimes(1);
  });
});
