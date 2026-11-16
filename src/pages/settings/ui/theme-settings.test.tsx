import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeSettings } from "@/pages/settings/ui/theme-settings";
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from "@/shared/lib/theme/theme";
import { ThemeProvider } from "@/shared/lib/theme/theme-provider";

let systemDark = false;
const listeners = new Set<() => void>();
const changeSystem = (dark: boolean) =>
  act(() => {
    systemDark = dark;
    for (const listener of listeners) listener();
  });

beforeEach(() => {
  systemDark = false;
  localStorage.clear();
  document.documentElement.className = "";
  document.head.innerHTML =
    '<style>:root { --theme-color: #fafbf9; } :root.dark { --theme-color: #121411; }</style><meta name="theme-color" content="#fafbf9">';
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return systemDark;
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  listeners.clear();
});

const expectMode = (mode: "light" | "dark") => {
  expect(document.documentElement.classList.contains("dark")).toBe(mode === "dark");
  expect(document.documentElement.style.colorScheme).toBe(mode);
  expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    mode === "dark" ? "#121411" : "#fafbf9",
  );
};

describe("테마 초기 적용과 설정", () => {
  it("React 없이 head 스크립트만으로 저장값을 적용한다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    window.eval(THEME_INIT_SCRIPT);
    expectMode("dark");
  });
  it("저장소를 읽지 못하면 시스템 모드로 초기화한다", () => {
    systemDark = true;
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    window.eval(THEME_INIT_SCRIPT);
    expectMode("dark");
  });
  it("전환·저장·시스템 변경·다른 탭 동기화를 지원한다", async () => {
    const user = userEvent.setup();
    const view = render(
      <ThemeProvider>
        <ThemeSettings />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole("button", { name: "다크" }));
    expectMode("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    changeSystem(true);
    await user.click(screen.getByRole("button", { name: "라이트" }));
    expectMode("light");
    changeSystem(false);
    expectMode("light");
    await user.click(screen.getByRole("button", { name: "시스템" }));
    changeSystem(true);
    expectMode("dark");
    changeSystem(false);
    expectMode("light");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" })));
    await waitFor(() => expectMode("dark"));
    view.unmount();
    expect(listeners.size).toBe(0);
  });
  it("저장이 차단되어도 화면을 전환한다", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(
      <ThemeProvider>
        <ThemeSettings />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "다크" }));
    expectMode("dark");
  });
});
