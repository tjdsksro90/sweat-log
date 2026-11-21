import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRecentStrengthWorkouts, getRecentStrengthWorkoutsForForm } from "./server-queries";

// supabase 쿼리 빌더 흉내. 거는 조건을 순서대로 적어 두고, 마지막 limit에서 결과를 돌려준다.
const { calls, result } = vi.hoisted(() => ({
  calls: [] as unknown[][],
  result: { current: { data: [] as unknown[] | null, error: null as unknown } },
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));
vi.mock("@/shared/api/supabase/require-user", () => {
  const builder: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["select", "eq", "neq", "gte", "lte", "order"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.limit = async (...args: unknown[]) => {
    calls.push(["limit", ...args]);
    return result.current;
  };
  return {
    requireUser: async () => ({
      supabase: {
        from: (table: string) => {
          calls.push(["from", table]);
          return builder;
        },
      },
      user: { id: "me" },
    }),
  };
});

beforeEach(() => {
  calls.length = 0;
  result.current = { data: [], error: null };
});

const ID = "00000000-0000-4000-8000-000000000001";

describe("최근 헬스 기록 조회", () => {
  it("내가 쓴 헬스 기록만 오늘 포함 7일 범위에서 최근 것부터 읽는다", async () => {
    result.current = {
      data: [
        {
          id: ID,
          sets: [
            { exercise_name: "런지", exercise_order: 1, reps: 12, set_order: 0, weight_kg: null },
            { exercise_name: "스쿼트", exercise_order: 0, reps: 10, set_order: 0, weight_kg: 60 },
          ],
          title: "하체",
          workout_date: "2026-11-20",
        },
        // 세트가 없는 헬스 기록은 불러올 게 없어 뺀다.
        { id: "x", sets: [], title: null, workout_date: "2026-11-19" },
      ],
      error: null,
    };

    expect(await getRecentStrengthWorkouts({ today: "2026-11-21" })).toEqual([
      {
        exercises: [
          { name: "스쿼트", sets: [{ reps: 10, weightKg: 60 }] },
          { name: "런지", sets: [{ reps: 12, weightKg: null }] },
        ],
        id: ID,
        title: "하체",
        workoutDate: "2026-11-20",
      },
    ]);
    // 동행자로 들어간 친구 기록은 RLS로 보이지만 user_id로 거른다.
    expect(calls).toContainEqual(["eq", "user_id", "me"]);
    expect(calls).toContainEqual(["eq", "kind", "strength"]);
    expect(calls).toContainEqual(["gte", "workout_date", "2026-11-15"]);
    expect(calls).toContainEqual(["lte", "workout_date", "2026-11-21"]);
    expect(calls).toContainEqual(["order", "workout_date", { ascending: false }]);
    expect(calls.some(([method]) => method === "neq")).toBe(false);
  });

  it("수정 화면은 지금 고치는 기록을 뺀다", async () => {
    await getRecentStrengthWorkouts({ excludeId: ID, today: "2026-11-21" });
    expect(calls).toContainEqual(["neq", "id", ID]);
  });

  it("폼용 조회는 실패해도 던지지 않고 undefined를 준다", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    result.current = { data: null, error: new Error("boom") };
    await expect(getRecentStrengthWorkouts()).rejects.toThrow("boom");
    expect(await getRecentStrengthWorkoutsForForm()).toBeUndefined();
    consoleError.mockRestore();
  });
});
