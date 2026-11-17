import { beforeEach, describe, expect, it, vi } from "vitest";

import { getStrengthRecords } from "./get-strength-records";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/supabase/require-user", () => ({ requireUser: async () => ({ supabase: { rpc } }) }));
beforeEach(() => rpc.mockReset());
describe("최고 무게 서버 조회", () => {
  it("서버 RPC만 호출하고 null 무게를 보존한다", async () => {
    rpc.mockResolvedValue({
      data: [
        { exercise_name: "풀업", max_weight_kg: null, workout_date: "2026-11-16", workout_id: "a", workout_count: 3 },
      ],
      error: null,
    });
    expect(await getStrengthRecords("2026-11-17")).toEqual([
      { exerciseName: "풀업", maxWeightKg: null, workoutDate: "2026-11-16", workoutId: "a", workoutCount: 3 },
    ]);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("get_strength_records", { p_today: "2026-11-17", p_limit: 5 });
  });
  it("조회 오류를 빈 기록으로 숨기지 않는다", async () => {
    const error = new Error("RPC 실패");
    rpc.mockResolvedValue({ data: null, error });
    await expect(getStrengthRecords("2026-11-17")).rejects.toBe(error);
  });
});
