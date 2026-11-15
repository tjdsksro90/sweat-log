import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCrew } from "@/entities/crew/api/queries";
import { requireUser } from "@/shared/api/supabase/require-user";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/supabase/require-user", () => ({ requireUser: vi.fn() }));

describe("getCrew", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    "abc",
    "",
    "../settings",
    "a1234567-abcd-1234-abcd-123456789abc/extra",
  ])("잘못된 ID %s는 DB 접근 없이 null을 반환한다", async (id) => {
    await expect(getCrew(id)).resolves.toBeNull();
    expect(requireUser).not.toHaveBeenCalled();
  });

  it("유효한 ID는 인증·조회 경로로 진행한다", async () => {
    const error = new Error("인증 실패");
    vi.mocked(requireUser).mockRejectedValueOnce(error);
    await expect(getCrew("a1234567-abcd-1234-abcd-123456789abc")).rejects.toBe(error);
    expect(requireUser).toHaveBeenCalledOnce();
  });
});
