import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCrew } from "@/entities/crew/api/queries";
import { getWorkoutPage } from "@/entities/workout/api/server-queries";

import { CrewDetailPage } from "./index";

vi.mock("@/entities/crew/api/queries", () => ({ getCrew: vi.fn() }));
vi.mock("@/entities/workout/api/server-queries", () => ({ getWorkoutPage: vi.fn() }));
vi.mock("@/features/crew/api/crew-actions", () => ({ leaveCrew: vi.fn() }));
vi.mock("@/shared/api/supabase/require-user", () => ({ requireUser: vi.fn(async () => ({ user: { id: "owner" } })) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

describe("크루 상세 조회 연결", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCrew).mockResolvedValue({
      id: "crew-id",
      name: "러너",
      inviteCode: "ABCDEF12",
      ownerId: "owner",
      members: [],
    });
    vi.mocked(getWorkoutPage).mockResolvedValue({ items: [], nextCursor: null });
  });

  it("해당 크루와 다음 페이지 커서를 피드 조회에 전달한다", async () => {
    await CrewDetailPage({
      params: Promise.resolve({ crewId: "crew-id" }),
      searchParams: Promise.resolve({ cursor: "next" }),
    });
    expect(getWorkoutPage).toHaveBeenCalledWith({ crewId: "crew-id", cursor: "next" });
  });

  it("중복 커서 파라미터는 첫 페이지로 조회한다", async () => {
    await CrewDetailPage({
      params: Promise.resolve({ crewId: "crew-id" }),
      searchParams: Promise.resolve({ cursor: ["a", "b"] }),
    });
    expect(getWorkoutPage).toHaveBeenCalledWith({ crewId: "crew-id", cursor: undefined });
  });

  it("없는 크루는 피드를 조회하지 않고 404로 처리한다", async () => {
    vi.mocked(getCrew).mockResolvedValueOnce(null);
    await expect(
      CrewDetailPage({ params: Promise.resolve({ crewId: "abc" }), searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(getWorkoutPage).not.toHaveBeenCalled();
  });
});
