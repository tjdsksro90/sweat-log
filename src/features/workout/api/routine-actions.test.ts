import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateRoutineExercises } from "./routine-actions";

const { update, eq, select, revalidatePath } = vi.hoisted(() => {
  const select = vi.fn();
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn((_row: unknown) => ({ eq }));
  return { eq, revalidatePath: vi.fn(), select, update };
});
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/shared/api/supabase/require-user", () => ({
  requireUser: async () => ({ supabase: { from: () => ({ update }) }, user: { id: "me" } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const ID = "00000000-0000-4000-8000-000000000001";
const EXERCISES = [{ name: "스쿼트", sets: [{ reps: 8, weightKg: 65 }] }];

describe("기록에서 루틴 구성 갱신", () => {
  it("이름은 두고 구성(exercises)만 바꾼다", async () => {
    select.mockResolvedValue({ data: [{ id: ID }], error: null });
    expect(await updateRoutineExercises(ID, EXERCISES)).toEqual({ id: ID, ok: true });
    expect(update).toHaveBeenCalledExactlyOnceWith({
      exercises: [{ name: "스쿼트", sets: [{ reps: 8, weight_kg: 65 }] }],
    });
    expect(eq).toHaveBeenCalledWith("id", ID);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("바뀐 행이 없으면(지웠거나 남의 루틴) 찾지 못했다고 알린다", async () => {
    select.mockResolvedValue({ data: [], error: null });
    expect(await updateRoutineExercises(ID, EXERCISES)).toEqual({
      error: "루틴을 찾지 못했어요. 이미 지웠는지 확인해 주세요.",
      ok: false,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("입력이 맞지 않으면 DB를 부르지 않는다", async () => {
    expect((await updateRoutineExercises(ID, [])).ok).toBe(false);
    expect((await updateRoutineExercises("abc", EXERCISES)).ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
