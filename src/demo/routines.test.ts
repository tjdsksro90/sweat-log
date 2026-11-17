import { describe, expect, it } from "vitest";

import type { RoutineInput } from "@/entities/routine/model/routine";
import { getKstToday } from "@/entities/workout/model/weekly-summary";

import { createSampleData } from "./sample-data";
import { createDemoStore, DEMO_STORAGE_KEY, type DemoStorage } from "./store";

const NOW = new Date("2026-11-16T00:00:00Z");
const LATER = new Date("2026-11-17T00:00:00Z");
const makeStore = (now = () => NOW, storage: () => DemoStorage | null = () => null) =>
  createDemoStore({ now, storage });
const memoryStorage = (): DemoStorage => {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
};
const routine = (override: Partial<RoutineInput> = {}): RoutineInput => ({
  name: "전신",
  exercises: [{ name: "데드리프트", sets: [{ reps: 5, weightKg: 80 }] }],
  ...override,
});

describe("체험 루틴", () => {
  it("샘플 루틴 두 개를 최근에 고친 것부터 준다", async () => {
    const routines = await makeStore().getRoutines();
    expect(routines.map((item) => item.name)).toEqual(["하체 데이", "상체 밀기"]);
    expect(routines[0].exercises[2]).toEqual({
      name: "런지",
      sets: Array.from({ length: 3 }, () => ({ reps: 12, weightKg: null })),
    });
  });

  it("만들고 고치고 지운다", async () => {
    let now = NOW;
    const store = makeStore(() => now);
    const created = await store.saveRoutine(routine({ name: " 전신 " }));
    if (!created.ok) throw new Error(created.error);
    expect((await store.getRoutines())[0]).toMatchObject({ id: created.id, name: "전신" });

    now = LATER;
    const updated = await store.saveRoutine(routine({ id: created.id, name: "전신 (증량)" }));
    expect(updated).toEqual({ ok: true, id: created.id });
    expect(await store.getRoutine(created.id)).toMatchObject({ name: "전신 (증량)", updatedAt: LATER.toISOString() });
    expect(await store.getRoutines()).toHaveLength(3);

    expect(await store.deleteRoutine(created.id)).toEqual({ ok: true });
    expect(await store.getRoutine(created.id)).toBeNull();
    expect((await store.deleteRoutine(created.id)).ok).toBe(false);
  });

  it("실제 앱과 같은 규칙으로 입력과 개수 상한을 막는다", async () => {
    const store = makeStore();
    expect((await store.saveRoutine(routine({ name: "가".repeat(41) }))).ok).toBe(false);
    expect((await store.saveRoutine(routine({ exercises: [] }))).ok).toBe(false);
    expect((await store.saveRoutine(routine({ id: "00000000-0000-4000-8000-00000000ffff" }))).ok).toBe(false);

    for (let index = 0; index < 28; index++) await store.saveRoutine(routine({ name: `루틴${index}` }));
    const full = await store.saveRoutine(routine({ name: "31번째" }));
    expect(full.ok).toBe(false);
    expect(!full.ok && full.error).toContain("30개까지");
  });

  it("조회 결과를 고쳐도 저장소의 루틴은 바뀌지 않는다", async () => {
    const store = makeStore();
    const [first] = await store.getRoutines();
    first.exercises[0].sets[0].weightKg = 999;
    expect((await store.getRoutine(first.id))?.exercises[0].sets[0].weightKg).toBe(40);
  });

  it("루틴을 고쳐도 이미 저장한 기록은 그대로다", async () => {
    const store = makeStore();
    const [first] = await store.getRoutines();
    const saved = await store.saveWorkout({
      kind: "strength",
      workoutDate: getKstToday(NOW),
      title: null,
      memo: null,
      placeName: null,
      crewId: null,
      companionIds: [],
      durationSeconds: null,
      run: null,
      exercises: first.exercises,
    });
    if (!saved.ok) throw new Error(saved.error);
    await store.saveRoutine({
      id: first.id,
      name: first.name,
      exercises: [{ name: "스쿼트", sets: [{ reps: 1, weightKg: 100 }] }],
    });
    expect((await store.getWorkoutDetail(saved.id))?.exercises).toEqual(first.exercises);
  });

  it("세션에 저장해 다시 열어도 루틴이 남는다", async () => {
    const storage = memoryStorage();
    const created = await makeStore(
      () => NOW,
      () => storage,
    ).saveRoutine(routine());
    if (!created.ok) throw new Error(created.error);
    expect(
      await makeStore(
        () => NOW,
        () => storage,
      ).getRoutine(created.id),
    ).not.toBeNull();
  });

  it("루틴이 생기기 전에 저장한 세션은 기록을 두고 샘플 루틴을 채운다", async () => {
    const storage = memoryStorage();
    const { routines: _routines, ...legacy } = createSampleData(NOW);
    legacy.workouts = legacy.workouts.slice(0, 2);
    legacy.comments = {};
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(legacy));
    const store = makeStore(
      () => NOW,
      () => storage,
    );
    expect((await store.getWorkoutPage()).items).toHaveLength(2);
    expect(await store.getRoutines()).toHaveLength(2);
  });

  it("손상된 루틴이 있으면 샘플로 돌아간다", async () => {
    const storage = memoryStorage();
    const state = createSampleData(NOW);
    state.workouts = state.workouts.slice(0, 2);
    state.comments = {};
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    expect(
      (
        await makeStore(
          () => NOW,
          () => storage,
        ).getWorkoutPage()
      ).items,
    ).toHaveLength(2);

    state.routines[0].exercises = [];
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    const store = makeStore(
      () => NOW,
      () => storage,
    );
    expect((await store.getWorkoutPage()).items.length).toBeGreaterThan(2);
    expect((await store.getRoutines())[0].exercises).toHaveLength(3);
  });
});
