import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppLink, type AppNavigation, AppNavigationProvider, useAppPathname, useAppRouter } from "./app-navigation";

const nextRouter = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/workouts", useRouter: () => nextRouter }));

const demoNavigation = (): AppNavigation => ({
  pathname: "/crews",
  push: vi.fn(),
  replace: vi.fn(),
  toHref: (path) => `/demo/app?path=${encodeURIComponent(path)}`,
});

function Probe() {
  const router = useAppRouter();
  const pathname = useAppPathname();
  return (
    <>
      <p>{pathname}</p>
      <button type="button" onClick={() => router.push("/workouts/new", { scroll: false })}>
        이동
      </button>
      <AppLink href="/workouts/abc">기록 보기</AppLink>
    </>
  );
}

describe("앱 내비게이션", () => {
  it("provider가 없으면 실제 경로와 Next 라우터를 그대로 쓴다", async () => {
    render(<Probe />);
    expect(screen.getByRole("link", { name: "기록 보기" })).toHaveAttribute("href", "/workouts/abc");
    expect(screen.getByText("/workouts")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "이동" }));
    expect(nextRouter.push).toHaveBeenCalledWith("/workouts/new", { scroll: false });
  });

  it("provider가 있으면 주소·이동·현재 경로를 provider에서 가져온다", async () => {
    nextRouter.push.mockClear();
    const value = demoNavigation();
    render(
      <AppNavigationProvider value={value}>
        <Probe />
      </AppNavigationProvider>,
    );
    expect(screen.getByRole("link", { name: "기록 보기" })).toHaveAttribute("href", "/demo/app?path=%2Fworkouts%2Fabc");
    expect(screen.getByText("/crews")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "이동" }));
    expect(value.push).toHaveBeenCalledWith("/workouts/new", { scroll: false });
    expect(nextRouter.push).not.toHaveBeenCalled();
  });
});
