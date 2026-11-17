import { describe, expect, it } from "vitest";

import type { WorkoutInput } from "@/entities/workout/model/contracts";

import { createSampleData, DEMO_CREW, DEMO_USER } from "./sample-data";
import { createDemoStore } from "./store";

const NOW = new Date("2026-11-17T00:00:00Z");
const setup = () => {
  const data = createSampleData(NOW);
  const base = data.workouts.find((w) => w.kind === "strength");
  if (!base) throw new Error("헬스 샘플 필요");
  const friend = DEMO_CREW.members.find((m) => m.userId !== DEMO_USER.id);
  if (!friend) throw new Error("친구 샘플 필요");
  const friendRow = {
    ...base,
    user_id: friend.userId,
    author: { id: friend.userId, nickname: friend.nickname ?? "친구" },
  };
  const set = (name: string, weight: number | null) => [
    { exercise_name: name, exercise_order: 0, set_order: 0, weight_kg: weight, reps: 5 },
  ];
  data.workouts = [
    {
      ...base,
      id: "50000000-0000-0000-0000-000000000001",
      workout_date: "2026-11-16",
      companions: [],
      sets: set("스쿼트", 40),
    },
    {
      ...friendRow,
      id: "50000000-0000-0000-0000-000000000002",
      workout_date: "2026-11-15",
      companions: [{ user_id: DEMO_USER.id, profile: DEMO_USER }],
      sets: set("스 쿼트", 60),
    },
    { ...friendRow, id: "50000000-0000-0000-0000-000000000003", companions: [], sets: set("스쿼트", 999) },
    { ...friendRow, id: "50000000-0000-0000-0000-000000000004", crew: null, companions: [], sets: set("스쿼트", 998) },
  ];
  data.comments = {};
  let raw = JSON.stringify(data);
  return createDemoStore({
    now: () => NOW,
    storage: () => ({
      getItem: () => raw,
      setItem: (_, value) => {
        raw = value;
      },
    }),
  });
};
const input: WorkoutInput = {
  kind: "strength",
  workoutDate: "2026-11-17",
  title: null,
  memo: null,
  placeName: null,
  crewId: null,
  companionIds: [],
  durationSeconds: null,
  run: null,
  exercises: [{ name: " 스쿼트 ", sets: [{ weightKg: 90, reps: 5 }] }],
};

describe("데모 헬스 최고 무게", () => {
  it("내 작성·동행은 포함하고 크루 공유만·비공유 친구 기록은 제외한다", async () => {
    expect(await setup().getStrengthRecords()).toEqual([
      {
        exerciseName: "스쿼트",
        maxWeightKg: 60,
        workoutDate: "2026-11-15",
        workoutId: "50000000-0000-0000-0000-000000000002",
        workoutCount: 2,
      },
    ]);
  });
  it("저장·수정·삭제 후 최고 무게를 다시 계산한다", async () => {
    const store = setup();
    const result = await store.saveWorkout(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((await store.getStrengthRecords())[0]).toMatchObject({ maxWeightKg: 90, workoutCount: 3 });
    await store.saveWorkout({
      ...input,
      id: result.id,
      exercises: [{ name: "스쿼트", sets: [{ weightKg: null, reps: 10 }] }],
    });
    expect((await store.getStrengthRecords())[0]).toMatchObject({ maxWeightKg: 60, workoutCount: 3 });
    await store.deleteWorkout(result.id);
    expect((await store.getStrengthRecords())[0]).toMatchObject({ maxWeightKg: 60, workoutCount: 2 });
  });
});
