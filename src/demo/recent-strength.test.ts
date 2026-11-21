import { describe, expect, it } from "vitest";

import { addDays, getKstToday } from "@/entities/workout/model/weekly-summary";

import { createDemoStore } from "./store";

const NOW = new Date("2026-11-16T00:00:00Z");
const LATER = new Date("2026-11-17T00:00:00Z");
const TODAY = getKstToday(NOW);
const mine = (day: number) => `30000000-0000-4000-8000-${String(day + 1).padStart(12, "0")}`;

describe("체험 최근 헬스 기록 불러오기", () => {
  it("오늘 포함 7일 안의 내가 쓴 헬스 기록만 최근 것부터 준다", async () => {
    const store = createDemoStore({ now: () => NOW, storage: () => null });
    const recent = await store.getRecentStrengthWorkouts();

    // 샘플 헬스는 1·4·7일 전. 7일 전은 범위 밖이고, 친구가 쓴 같은 구성 기록은 빠진다.
    expect(recent.map((workout) => workout.id)).toEqual([mine(1), mine(4)]);
    expect(recent[0]).toEqual({
      exercises: [
        {
          name: "스쿼트",
          sets: [
            { reps: 10, weightKg: 40 },
            { reps: 10, weightKg: 40 },
          ],
        },
        { name: "푸시업", sets: [{ reps: 15, weightKg: null }] },
      ],
      id: mine(1),
      title: "오늘도 한 세트 더",
      workoutDate: addDays(TODAY, -1),
    });
  });

  it("6일 전까지는 넣고 7일 전은 뺀다", async () => {
    const store = createDemoStore({ now: () => NOW, storage: () => null });
    const dates = (await store.getRecentStrengthWorkouts({ today: addDays(TODAY, -1) })).map((w) => w.workoutDate);
    // 기준일을 하루 당기면 7일 전 기록(기준일로부터 6일 전)이 들어온다.
    expect(dates).toEqual([addDays(TODAY, -1), addDays(TODAY, -4), addDays(TODAY, -7)]);
  });

  it("수정 중인 기록 자신은 뺀다", async () => {
    const store = createDemoStore({ now: () => NOW, storage: () => null });
    const recent = await store.getRecentStrengthWorkouts({ excludeId: mine(1) });
    expect(recent.map((workout) => workout.id)).toEqual([mine(4)]);
  });
});

describe("체험 루틴 갱신", () => {
  it("이름은 두고 구성만 바꾼다", async () => {
    let now = NOW;
    const store = createDemoStore({ now: () => now, storage: () => null });
    const [routine] = await store.getRoutines();
    now = LATER;

    const exercises = [{ name: "스쿼트", sets: [{ reps: 8, weightKg: 65 }] }];
    expect(await store.updateRoutineExercises(routine.id, exercises)).toEqual({ ok: true, id: routine.id });
    expect(await store.getRoutine(routine.id)).toEqual({
      ...routine,
      exercises,
      updatedAt: LATER.toISOString(),
    });
  });

  it("지운 루틴이나 잘못된 구성은 실패로 알린다", async () => {
    const store = createDemoStore({ now: () => NOW, storage: () => null });
    const [routine] = await store.getRoutines();
    await store.deleteRoutine(routine.id);

    const result = await store.updateRoutineExercises(routine.id, [
      { name: "스쿼트", sets: [{ reps: 8, weightKg: 65 }] },
    ]);
    expect(result).toEqual({ ok: false, error: "루틴을 찾지 못했어요. 이미 지웠는지 확인해 주세요." });
    const [other] = await store.getRoutines();
    expect((await store.updateRoutineExercises(other.id, [])).ok).toBe(false);
  });
});
