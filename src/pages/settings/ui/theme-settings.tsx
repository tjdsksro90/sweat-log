"use client";

import { useTheme } from "@/shared/lib/theme/theme-provider";
import { Card, CardContent } from "@/shared/ui/card";
import { SegmentedControl } from "@/shared/ui/segmented-control";

export function ThemeSettings() {
  const { preference, ready, setPreference } = useTheme();
  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="font-semibold text-title">화면 모드</h2>
        <SegmentedControl
          label="화면 모드"
          value={preference}
          onValueChange={setPreference}
          disabled={!ready}
          options={[
            { value: "light", label: "라이트" },
            { value: "dark", label: "다크" },
            { value: "system", label: "시스템" },
          ]}
        />
        <p className="text-caption text-muted-foreground">이 브라우저에만 저장돼요. 시스템은 기기 설정을 따라요.</p>
      </CardContent>
    </Card>
  );
}
