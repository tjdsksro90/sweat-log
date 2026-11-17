import { beforeEach, describe, expect, it, vi } from "vitest";

import { getStrengthWorkoutTemplate } from "./server-queries";

const { maybeSingle, select } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const select = vi.fn(() => ({ eq: () => ({ maybeSingle }) }));
  return { maybeSingle, select };
});
vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/supabase/require-user", () => ({
  requireUser: async () => ({ supabase: { from: () => ({ select }), storage: {} }, user: { id: "me" } }),
}));
beforeEach(() => {
  maybeSingle.mockReset();
  select.mockClear();
});

const ID = "00000000-0000-4000-8000-000000000001";

describe("루틴 만들기용 헬스 구성 조회", () => {
  it("제목과 종목·세트만 읽어 순서대로 묶는다", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        kind: "strength",
        sets: [
          { exercise_name: "런지", exercise_order: 1, reps: 12, set_order: 0, weight_kg: null },
          { exercise_name: "스쿼트", exercise_order: 0, reps: 8, set_order: 1, weight_kg: 70 },
          { exercise_name: "스쿼트", exercise_order: 0, reps: 10, set_order: 0, weight_kg: 60 },
        ],
        title: "하체",
      },
      error: null,
    });
    expect(await getStrengthWorkoutTemplate(ID)).toEqual({
      exercises: [
        {
          name: "스쿼트",
          sets: [
            { reps: 10, weightKg: 60 },
            { reps: 8, weightKg: 70 },
          ],
        },
        { name: "런지", sets: [{ reps: 12, weightKg: null }] },
      ],
      title: "하체",
    });
    // 사진·댓글·동행자는 읽지 않는다(서명 URL을 만들지 않는다).
    expect(select).toHaveBeenCalledExactlyOnceWith(expect.not.stringMatching(/photo|comment|companion/));
  });

  it("볼 수 없거나 헬스가 아니면 null", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getStrengthWorkoutTemplate(ID)).toBeNull();
    maybeSingle.mockResolvedValue({ data: { kind: "run", sets: [], title: null }, error: null });
    expect(await getStrengthWorkoutTemplate(ID)).toBeNull();
  });

  it("uuid가 아니면 조회하지 않는다", async () => {
    expect(await getStrengthWorkoutTemplate("abc")).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });
});
