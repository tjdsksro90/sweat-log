export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "sweat-log-theme";
export const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

export const parseThemePreference = (stored: string | null): ThemePreference =>
  stored === "light" || stored === "dark" ? stored : "system";

export const resolveTheme = (stored: string | null, systemDark: boolean): "light" | "dark" =>
  stored === "light" || stored === "dark" ? stored : systemDark ? "dark" : "light";

/**
 * resolveTheme과 applyTheme은 toString()으로 head에 삽입된다.
 * import한 값이나 함수 바깥의 변수(같은 모듈의 상수 포함)를 참조하면 독립 실행 시 ReferenceError가 난다.
 * 두 함수는 브라우저 전역과 인자, 함수 내부 상수만 사용해야 한다.
 */
export const applyTheme = (mode: "light" | "dark") => {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.classList.toggle("light", mode === "light");
  root.style.colorScheme = mode;
  // CSS가 로드되기 전에도 적용한다. 이 meta는 viewport/React가 아닌 스크립트만 관리한다.
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = mode === "dark" ? "#121411" : "#fafbf9";
};

// 함수 본문은 toString()으로 직렬화되므로 위 두 함수에 외부 참조를 추가하지 않는다.
// React 실행을 기다리지 않고 첫 페인트 전에 적용한다. 사용자 입력은 삽입하지 않는다.
export const THEME_INIT_SCRIPT = `(() => {
  let stored = null;
  try { stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch {}
  const mode = (${resolveTheme.toString()})(stored, matchMedia(${JSON.stringify(DARK_MODE_QUERY)}).matches);
  (${applyTheme.toString()})(mode);
})();`;
