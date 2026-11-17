import { describe, expect, it } from "vitest";

import { describeRoutine, toRoutine, toRoutineExercisesJson } from "./routine";

const EXERCISES = [
  { name: "스쿼트", sets: [{ reps: 10, weightKg: 60.5 }] },
  { name: "푸시업", sets: [{ reps: 15, weightKg: null }] },
];

describe("루틴 행 변환", () => {
  it("jsonb는 save_workout처럼 snake_case로 두고, 읽을 때 되돌린다", () => {
    const json = toRoutineExercisesJson(EXERCISES);
    expect(json).toEqual([
      { name: "스쿼트", sets: [{ reps: 10, weight_kg: 60.5 }] },
      { name: "푸시업", sets: [{ reps: 15, weight_kg: null }] },
    ]);
    expect(toRoutine({ exercises: json, id: "r1", name: "하체", updated_at: "2026-11-17T00:00:00Z" })).toEqual({
      exercises: EXERCISES,
      id: "r1",
      name: "하체",
      updatedAt: "2026-11-17T00:00:00Z",
    });
  });

  it("모양이 어긋난 종목·세트는 빼고 읽는다", () => {
    const routine = toRoutine({
      exercises: [
        { name: "스쿼트", sets: [{ reps: "10", weight_kg: 60 }] },
        { name: 1 },
        { name: "런지", sets: [{ reps: 12, weight_kg: null }] },
      ],
      id: "r1",
      name: "하체",
      updated_at: "2026-11-17T00:00:00Z",
    });
    expect(routine.exercises).toEqual([{ name: "런지", sets: [{ reps: 12, weightKg: null }] }]);
    expect(toRoutine({ exercises: null, id: "r1", name: "x", updated_at: "" }).exercises).toEqual([]);
  });

  it("목록 한 줄 설명에 종목·세트 수와 종목 이름을 담는다", () => {
    expect(describeRoutine({ exercises: EXERCISES })).toBe("종목 2개 · 세트 2개 · 스쿼트, 푸시업");
  });
});
