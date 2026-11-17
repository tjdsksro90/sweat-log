import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMyRoutinesForForm } from "./server-queries";

const { order, requireUser } = vi.hoisted(() => {
  const order = vi.fn();
  const query = { order: vi.fn(() => ({ order })), select: vi.fn() };
  query.select.mockReturnValue(query);
  return {
    order,
    requireUser: vi.fn(async () => ({ supabase: { from: () => query } })),
  };
});
vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/supabase/require-user", () => ({ requireUser }));

beforeEach(() => {
  order.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("기록 폼용 루틴 조회", () => {
  it("읽은 루틴을 화면 모양으로 준다", async () => {
    order.mockResolvedValue({
      data: [
        {
          exercises: [{ name: "스쿼트", sets: [{ reps: 10, weight_kg: 60 }] }],
          id: "r1",
          name: "하체",
          updated_at: "2026-11-17T00:00:00Z",
        },
      ],
      error: null,
    });
    expect(await getMyRoutinesForForm()).toEqual([
      {
        exercises: [{ name: "스쿼트", sets: [{ reps: 10, weightKg: 60 }] }],
        id: "r1",
        name: "하체",
        updatedAt: "2026-11-17T00:00:00Z",
      },
    ]);
  });

  it("조회가 실패해도 폼을 깨지 않고 불러오기만 숨긴다(undefined)", async () => {
    order.mockResolvedValue({
      data: null,
      error: { code: "42P01", message: 'relation "workout_routines" does not exist' },
    });
    expect(await getMyRoutinesForForm()).toBeUndefined();
  });

  it("네트워크 오류로 throw해도 undefined", async () => {
    order.mockRejectedValue(new TypeError("fetch failed"));
    expect(await getMyRoutinesForForm()).toBeUndefined();
  });

  it("로그인 redirect 같은 Next 내부 오류는 삼키지 않는다", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    requireUser.mockRejectedValueOnce(redirect);
    await expect(getMyRoutinesForForm()).rejects.toBe(redirect);
  });
});
