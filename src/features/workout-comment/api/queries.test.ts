import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOlderWorkoutComments, getWorkoutComments } from "@/features/workout-comment/api/queries";
import { requireUser } from "@/shared/api/supabase/require-user";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/supabase/require-user", () => ({ requireUser: vi.fn() }));

describe("getWorkoutComments", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    "abc",
    "",
    "../workouts",
    "a1234567-abcd-1234-abcd-123456789abc?x=1",
  ])("잘못된 ID %s는 DB 접근 없이 빈 목록을 반환한다", async (id) => {
    await expect(getWorkoutComments(id)).resolves.toEqual({ comments: [], olderCursor: null, total: 0 });
    expect(requireUser).not.toHaveBeenCalled();
  });

  it("유효한 ID는 인증·조회 경로로 진행한다", async () => {
    const error = new Error("인증 실패");
    vi.mocked(requireUser).mockRejectedValueOnce(error);
    await expect(getWorkoutComments("a1234567-abcd-1234-abcd-123456789abc")).rejects.toBe(error);
    expect(requireUser).toHaveBeenCalledOnce();
  });

  it("최신순으로 51개를 읽어 50개를 오래된 순으로 주고, 전체 개수는 따로 센다", async () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(51 - index).padStart(12, "0")}`,
      user_id: index === 0 ? "me" : "friend",
      body: `댓글 ${51 - index}`,
      created_at: `2026-11-16T00:00:${String(51 - index).padStart(2, "0")}.123456+00:00`,
      profiles: { nickname: "친구" },
    }));
    const { supabase, calls } = fakeSupabase([
      { data: rows, error: null },
      { count: 1234, error: null },
    ]);
    vi.mocked(requireUser).mockResolvedValue({ supabase, user: { id: "me" } } as never);
    const page = await getWorkoutComments(WORKOUT_ID);
    expect(page.total).toBe(1234);
    expect(page.comments).toHaveLength(50);
    expect(page.comments[0].body).toBe("댓글 2");
    expect(page.comments.at(-1)).toMatchObject({ body: "댓글 51", isMine: true });
    expect(page.olderCursor).not.toBeNull();
    expect(calls[0]).toContainEqual(["order", "created_at", { ascending: false }]);
    expect(calls[0]).toContainEqual(["limit", 51]);
    expect(calls[1]).toContainEqual(["select", "id", { count: "exact", head: true }]);
  });

  it("이전 댓글은 커서의 (작성 시각, id)보다 오래된 것만 읽는다", async () => {
    const { supabase, calls } = fakeSupabase([{ data: [], error: null }]);
    vi.mocked(requireUser).mockResolvedValue({ supabase, user: { id: "me" } } as never);
    const cursor = { createdAt: "2026-11-16T00:00:02.123456+00:00", id: "00000000-0000-4000-8000-000000000002" };
    await expect(getOlderWorkoutComments(WORKOUT_ID, cursor)).resolves.toEqual({ comments: [], olderCursor: null });
    expect(calls[0]).toContainEqual([
      "or",
      'created_at.lt."2026-11-16T00:00:02.123456+00:00",and(created_at.eq."2026-11-16T00:00:02.123456+00:00",id.lt.00000000-0000-4000-8000-000000000002)',
    ]);
  });
});

const WORKOUT_ID = "a1234567-abcd-1234-abcd-123456789abc";

// from()마다 호출을 기록하고, await하면 준비한 결과를 순서대로 돌려주는 가짜 쿼리 빌더.
const fakeSupabase = (results: unknown[]) => {
  const calls: unknown[][][] = [];
  const supabase = {
    from: () => {
      const log: unknown[][] = [];
      calls.push(log);
      const result = results[calls.length - 1];
      const builder: Record<string, unknown> = {
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
      };
      for (const method of ["select", "eq", "or", "order", "limit"])
        builder[method] = (...args: unknown[]) => {
          log.push([method, ...args]);
          return builder;
        };
      return builder;
    },
  };
  return { supabase, calls };
};
