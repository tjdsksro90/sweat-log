import { describe, expect, it } from "vitest";

import { describeRecentStrength, formatRecentStrengthDate, getRecentStrengthRange } from "./recent-strength";

describe("최근 헬스 기록 범위", () => {
  it("오늘 포함 7일이다", () => {
    expect(getRecentStrengthRange("2026-11-21")).toEqual({ from: "2026-11-15", to: "2026-11-21" });
    // 달이 바뀌어도 날짜로 센다.
    expect(getRecentStrengthRange("2026-12-03")).toEqual({ from: "2026-11-27", to: "2026-12-03" });
  });

  it("날짜와 구성을 한 줄로 보여 준다", () => {
    expect(formatRecentStrengthDate("2026-11-20")).toBe("11월 20일 (금)");
    expect(
      describeRecentStrength({
        exercises: [
          {
            name: "스쿼트",
            sets: [
              { reps: 10, weightKg: 60 },
              { reps: 8, weightKg: 70 },
            ],
          },
          { name: "런지", sets: [{ reps: 12, weightKg: null }] },
        ],
      }),
    ).toBe("종목 2개 · 세트 3개 · 스쿼트, 런지");
  });
});
