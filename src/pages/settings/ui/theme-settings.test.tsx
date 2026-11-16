import { renderToString } from "react-dom/server";

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
  document.documentElement.removeAttribute("style");
  document.head.innerHTML = "";
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
  expect(document.documentElement.classList.contains("light")).toBe(mode === "light");
  expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
  expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    mode === "dark" ? "#121411" : "#fafbf9",
  );
};

describe("테마 초기 적용과 설정", () => {
  it("서버는 임의의 선택을 표시하지 않고 클라이언트는 저장값을 바로 읽는다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const content = (
      <ThemeProvider>
        <ThemeSettings />
      </ThemeProvider>
    );
    const serverMarkup = document.createElement("div");
    serverMarkup.innerHTML = renderToString(content);
    expect(serverMarkup.querySelectorAll("input:checked")).toHaveLength(0);
    render(content);
    expect(screen.getByRole("radio", { name: "다크" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "시스템" })).not.toBeChecked();
  });
  it("화면 제목으로 그룹을 읽고 방향키로 하나만 선택한다", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSettings />
      </ThemeProvider>,
    );
    expect(screen.getByRole("radiogroup", { name: "화면 모드" })).toBeInTheDocument();
    const system = screen.getByRole("radio", { name: "시스템" });
    system.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "라이트" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "라이트" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "다크" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    expectMode("dark");
    await user.keyboard("{ArrowLeft}");
    expectMode("light");
  });
  it("React 없이 head 스크립트만으로 저장값을 적용한다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    window.eval(THEME_INIT_SCRIPT);
    window.eval(THEME_INIT_SCRIPT);
    expectMode("dark");
  });
  it("저장소를 읽지 못하면 시스템 모드로 초기화한다", () => {
    systemDark = true;
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    window.eval(THEME_INIT_SCRIPT);
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
    await user.click(screen.getByRole("radio", { name: "다크" }));
    expectMode("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    changeSystem(true);
    await user.click(screen.getByRole("radio", { name: "라이트" }));
    expectMode("light");
    changeSystem(false);
    expectMode("light");
    await user.click(screen.getByRole("radio", { name: "시스템" }));
    changeSystem(true);
    expectMode("dark");
    changeSystem(false);
    expectMode("light");
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
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
    await userEvent.click(screen.getByRole("radio", { name: "다크" }));
    expectMode("dark");
    vi.restoreAllMocks();
    await userEvent.click(screen.getByRole("radio", { name: "시스템" }));
  });
});
