import { describe, expect, it } from "vitest";

import { parseThemePreference, resolveTheme } from "./theme";

describe("화면 모드 결정", () => {
  it.each([null, "system", "invalid", "", "DARK"])("%s는 시스템 설정을 따른다", (stored) => {
    expect(parseThemePreference(stored)).toBe("system");
    expect(resolveTheme(stored, true)).toBe("dark");
    expect(resolveTheme(stored, false)).toBe("light");
  });
  it.each([true, false])("명시한 모드는 OS 설정(%s)보다 우선한다", (systemDark) => {
    expect(resolveTheme("light", systemDark)).toBe("light");
    expect(resolveTheme("dark", systemDark)).toBe("dark");
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
  });
});
