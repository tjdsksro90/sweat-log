"use client";

import { useId } from "react";

import { useTheme } from "@/shared/lib/theme/theme-provider";
import { Card, CardContent } from "@/shared/ui/card";

const OPTIONS = [
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
  { value: "system", label: "시스템" },
] as const;

export function ThemeSettings() {
  const { preference, ready, setPreference } = useTheme();
  const id = useId();
  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 id={`${id}-title`} className="font-semibold text-title">
          화면 모드
        </h2>
        <fieldset
          role="radiogroup"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-help`}
          disabled={!ready}
          className="flex gap-1 rounded-xl bg-muted p-1"
        >
          {OPTIONS.map(({ value, label }) => (
            <label key={value} className="min-w-0 flex-1 cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name={`${id}-theme`}
                value={value}
                checked={preference === value}
                aria-checked={preference === value}
                onChange={() => setPreference(value)}
              />
              <span className="flex min-h-11 items-center justify-center rounded-lg px-2 text-caption peer-checked:bg-surface peer-checked:text-foreground peer-checked:shadow-card peer-focus-visible:outline-2 peer-focus-visible:outline-ring">
                {label}
              </span>
            </label>
          ))}
        </fieldset>
        <p id={`${id}-help`} className="text-caption text-muted-foreground">
          이 브라우저에만 저장돼요. 시스템은 기기 설정을 따라요.
        </p>
      </CardContent>
    </Card>
  );
}
