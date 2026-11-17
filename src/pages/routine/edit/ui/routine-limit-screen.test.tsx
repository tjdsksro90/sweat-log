import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RoutineLimitScreen } from "./routine-limit-screen";

vi.mock("next/navigation", () => ({ usePathname: () => "/settings/routines/new", useRouter: () => ({}) }));

describe("루틴 상한 안내", () => {
  it("가득 찼다고 알리고 내 루틴으로 보낸다", () => {
    render(<RoutineLimitScreen />);
    expect(screen.getByRole("heading", { name: "루틴이 30개로 가득 찼어요" })).toBeDefined();
    expect(screen.getByRole("link", { name: "내 루틴으로" }).getAttribute("href")).toBe("/settings/routines");
  });
});
