import { describe, expect, it } from "vitest";

import { SAMPLE_WEEKLY_SUMMARY } from "@/entities/workout/model/fixtures";
import { buildWeekDays } from "@/pages/home/model/week";

describe("week", () => {
  it("월요일부터 일요일까지 실제 운동한 날을 표시한다", () => {
    const days = buildWeekDays(SAMPLE_WEEKLY_SUMMARY);
    expect(days.map((day) => day.label)).toEqual(["월", "화", "수", "목", "금", "토", "일"]);
    expect(days.filter((day) => day.active).map((day) => day.date)).toEqual(SAMPLE_WEEKLY_SUMMARY.activeDates);
  });

  it("연도 경계를 넘고 중복 날짜와 주 바깥 날짜는 표시를 늘리지 않는다", () => {
    const days = buildWeekDays({ weekStart: "2025-12-29", activeDates: ["2026-01-01", "2026-01-01", "2026-01-05"] });
    expect(days.length).toBe(7);
    expect(days[6].date).toBe("2026-01-04");
    expect(days.filter((day) => day.active).length).toBe(1);
    expect(buildWeekDays({ weekStart: "2024-02-26", activeDates: [] })[3].date).toBe("2024-02-29");
  });

  it("유효하지 않은 날짜나 월요일이 아닌 주 시작일을 거부한다", () => {
    for (const weekStart of ["invalid", "2026-02-30", "2026-11-10", "2026-1-1"]) {
      expect(() => buildWeekDays({ weekStart, activeDates: [] })).toThrow(RangeError);
    }
  });
});
