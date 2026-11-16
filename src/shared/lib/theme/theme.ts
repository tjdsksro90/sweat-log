export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "sweat-log-theme";
export const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

export const parseThemePreference = (stored: string | null): ThemePreference =>
  stored === "light" || stored === "dark" ? stored : "system";

export const resolveTheme = (stored: string | null, systemDark: boolean): "light" | "dark" =>
  stored === "light" || stored === "dark" ? stored : systemDark ? "dark" : "light";

// 외부 변수에 의존하지 않아 head 초기 스크립트에서도 같은 함수를 사용한다.
export const applyTheme = (mode: "light" | "dark") => {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
  const color = getComputedStyle(root).getPropertyValue("--theme-color").trim();
  if (color) {
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute("content", color);
      meta.removeAttribute("media");
    }
  }
};

// React 실행을 기다리지 않고 첫 페인트 전에 적용한다. 사용자 입력은 삽입하지 않는다.
export const THEME_INIT_SCRIPT = `(() => {
  let stored = null;
  try { stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch {}
  const mode = (${resolveTheme.toString()})(stored, matchMedia(${JSON.stringify(DARK_MODE_QUERY)}).matches);
  (${applyTheme.toString()})(mode);
})();`;
