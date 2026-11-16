"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import {
  applyTheme,
  DARK_MODE_QUERY,
  parseThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "./theme";

const ThemeContext = createContext<{
  preference: ThemePreference;
  ready: boolean;
  setPreference: (value: ThemePreference) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {}
    setPreferenceState(parseThemePreference(stored));
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setPreferenceState(parseThemePreference(event.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const media = matchMedia(DARK_MODE_QUERY);
    const update = () => applyTheme(resolveTheme(preference, media.matches));
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference, ready]);

  const setPreference = (value: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {}
    setPreferenceState(value);
    applyTheme(resolveTheme(value, matchMedia(DARK_MODE_QUERY).matches));
  };

  return <ThemeContext value={{ preference, ready, setPreference }}>{children}</ThemeContext>;
}

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("ThemeProvider가 필요합니다.");
  return theme;
};
