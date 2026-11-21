import { describe, expect, it } from "vitest";

import type { WorkoutInput } from "@/entities/workout/model/contracts";
import { getKstToday } from "@/entities/workout/model/weekly-summary";

import { createDemoStore, type DemoStorage } from "./store";
import { createDemoUserExerciseStore, DEMO_USER_EXERCISES_KEY } from "./user-exercises";

const memoryStorage = (): DemoStorage => {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
};

const strength = (names: string[]): WorkoutInput => ({
  companionIds: [],
  crewId: null,
  durationSeconds: 1800,
  exercises: names.map((name) => ({ name, sets: [{ reps: 10, weightKg: 20 }] })),
  kind: "strength",
  memo: null,
  placeName: null,
  run: null,
  title: null,
  workoutDate: getKstToday(),
});

const makeStores = (storage: () => DemoStorage | null = () => null) => {
  const workouts = createDemoStore({ storage: () => null });
  return { exercises: createDemoUserExerciseStore({ storage, workouts }), workouts };
};

describe("체험 내 종목", () => {
  it("샘플 하나로 시작하고 만들고 고치고 지운다", async () => {
    const { exercises } = makeStores();
    expect((await exercises.getUserExercises()).map((item) => item.name)).toEqual(["케이블 킥백"]);

    const created = await exercises.saveUserExercise({ bodyPart: "코어", bodyweight: true, name: " 드래곤 플래그 " });
    expect(created).toMatchObject({
      exercise: { bodyPart: "코어", bodyweight: true, name: "드래곤 플래그" },
      ok: true,
    });
    if (!created.ok) throw new Error("저장 실패");

    const edited = await exercises.saveUserExercise({
      bodyPart: "코어",
      bodyweight: true,
      id: created.exercise.id,
      name: "드래곤플래그",
    });
    expect(edited).toMatchObject({ ok: true });
    expect((await exercises.getUserExercises()).map((item) => item.name)).toEqual(["드래곤플래그", "케이블 킥백"]);

    expect(await exercises.deleteUserExercise(created.exercise.id)).toEqual({ ok: true });
    expect((await exercises.deleteUserExercise(created.exercise.id)).ok).toBe(false);
  });

  it("사전·내 종목과 공백만 다른 이름은 만들지 않고 그 종목을 알려 준다", async () => {
    const { exercises } = makeStores();
    expect(await exercises.saveUserExercise({ bodyPart: "등", bodyweight: true, name: "풀 업" })).toMatchObject({
      duplicate: { name: "풀업" },
      ok: false,
    });
    const result = await exercises.saveUserExercise({ bodyPart: "팔", bodyweight: false, name: "케이블킥백" });
    expect(result).toMatchObject({ duplicate: { name: "케이블 킥백" }, ok: false });
    expect(result.ok || result.duplicate?.userExerciseId).toBeTruthy();
  });

  it("100개까지 저장한다", async () => {
    const { exercises } = makeStores();
    for (let index = 1; index < 100; index++) {
      expect((await exercises.saveUserExercise({ bodyPart: "하체", bodyweight: false, name: `종목${index}` })).ok).toBe(
        true,
      );
    }
    expect(await exercises.saveUserExercise({ bodyPart: "하체", bodyweight: false, name: "101번째" })).toMatchObject({
      ok: false,
    });
  });

  it("세션에 남기고 reset하면 샘플로 돌아간다", async () => {
    const storage = memoryStorage();
    const first = makeStores(() => storage).exercises;
    await first.saveUserExercise({ bodyPart: "팔", bodyweight: false, name: "리버스 컬" });
    expect(storage.getItem(DEMO_USER_EXERCISES_KEY)).toContain("리버스 컬");
    expect((await makeStores(() => storage).exercises.getUserExercises()).map((item) => item.name)).toContain(
      "리버스 컬",
    );
    first.reset();
    expect((await makeStores(() => storage).exercises.getUserExercises()).map((item) => item.name)).toEqual([
      "케이블 킥백",
    ]);
    storage.setItem(DEMO_USER_EXERCISES_KEY, '[{"id":"x"}]');
    expect((await makeStores(() => storage).exercises.getUserExercises()).map((item) => item.name)).toEqual([
      "케이블 킥백",
    ]);
  });

  it("내가 쓴 헬스 기록의 이름을 공백을 뺀 이름으로 묶는다", async () => {
    const { exercises, workouts } = makeStores();
    await workouts.saveWorkout(strength(["케이블 크런치", "드래곤 플래그"]));
    await workouts.saveWorkout(strength(["드래곤플래그"]));
    const names = await exercises.getRecordedExerciseNames();
    expect(names[0]).toMatchObject({ workoutCount: expect.any(Number) });
    const dragon = names.find((item) => item.name.replace(/\s/g, "") === "드래곤플래그");
    expect(dragon?.workoutCount).toBe(2);
    expect(names.filter((item) => item.name.replace(/\s/g, "") === "드래곤플래그")).toHaveLength(1);
  });
});
