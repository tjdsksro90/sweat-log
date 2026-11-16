"use client";

import { createContext, type ReactNode, useContext, useEffect, useSyncExternalStore } from "react";

import {
  applyTheme,
  DARK_MODE_QUERY,
  parseThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "./theme";

const THEME_CHANGE_EVENT = "sweat-log-theme-change";
// 저장이 차단돼도 현재 문서에서는 사용자의 선택을 유지한다.
let transientPreference: ThemePreference | null = null;

const getSnapshot = (): ThemePreference => {
  if (transientPreference !== null) return transientPreference;
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
};
// 서버는 브라우저 저장값을 모르므로 임의의 항목을 선택해 표시하지 않는다.
const getServerSnapshot = () => null;

const subscribe = (notify: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea && event.storageArea !== localStorage) return;
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      transientPreference = null;
      notify();
    }
  };
  window.addEventListener(THEME_CHANGE_EVENT, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, notify);
    window.removeEventListener("storage", onStorage);
  };
};

const setPreference = (value: ThemePreference) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
    transientPreference = null;
  } catch {
    transientPreference = value;
  }
  applyTheme(resolveTheme(value, matchMedia(DARK_MODE_QUERY).matches));
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
};

const ThemeContext = createContext<{
  preference: ThemePreference | null;
  ready: boolean;
  setPreference: (value: ThemePreference) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (preference === null) return;
    const media = matchMedia(DARK_MODE_QUERY);
    const update = () => applyTheme(resolveTheme(preference, media.matches));
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);

  return <ThemeContext value={{ preference, ready: preference !== null, setPreference }}>{children}</ThemeContext>;
}

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("ThemeProvider가 필요합니다.");
  return theme;
};
