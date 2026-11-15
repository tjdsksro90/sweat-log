import { describe, expect, it } from "vitest";

import { SAMPLE_WEEKLY_SUMMARY } from "@/entities/workout/model/fixtures";
import {
  addDays,
  buildWeeklySummary,
  countStreakDays,
  getKstToday,
  getWeekStart,
  type WeeklyWorkoutRow,
} from "@/entities/workout/model/weekly-summary";

describe("날짜 계산", () => {
  it("한국 시간으로 오늘 날짜를 구한다", () => {
    // UTC 15:00 = 한국 자정
    expect(getKstToday(new Date("2026-11-14T14:59:59Z"))).toBe("2026-11-14");
    expect(getKstToday(new Date("2026-11-14T15:00:00Z"))).toBe("2026-11-15");
  });

  it("주는 월요일에 시작한다", () => {
    expect(getWeekStart("2026-11-09")).toBe("2026-11-09"); // 월
    expect(getWeekStart("2026-11-14")).toBe("2026-11-09"); // 토
    expect(getWeekStart("2026-11-15")).toBe("2026-11-09"); // 일
    expect(getWeekStart("2026-11-16")).toBe("2026-11-16"); // 다음 주 월
    expect(getWeekStart("2027-01-01")).toBe("2026-12-28"); // 해를 넘긴다
  });

  it("날짜 더하기는 월·해를 넘긴다", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("countStreakDays", () => {
  it("연속 운동 일수는 오늘, 오늘 안 했으면 어제부터 센다", () => {
    const dates = ["2026-11-14", "2026-11-13", "2026-11-13", "2026-11-11"];

    expect(countStreakDays(dates, "2026-11-14")).toBe(2);
    expect(countStreakDays(dates, "2026-11-15")).toBe(2);
    expect(countStreakDays(dates, "2026-11-16")).toBe(0);
    expect(countStreakDays([], "2026-11-14")).toBe(0);
  });
});

describe("buildWeeklySummary", () => {
  it("이번 주 기록을 요약한다", () => {
    const weekWorkouts: WeeklyWorkoutRow[] = [
      { kind: "run", workout_date: "2026-11-14", run: { distance_meters: 7200 }, sets: [] },
      {
        kind: "strength",
        workout_date: "2026-11-13",
        run: null,
        sets: [
          { weight_kg: 60, reps: 10 },
          { weight_kg: 70, reps: 8 },
          { weight_kg: 80, reps: 6 },
          { weight_kg: 20, reps: 12 },
          { weight_kg: 20, reps: 12 },
          { weight_kg: null, reps: 15 },
        ],
      },
      { kind: "other", workout_date: "2026-11-11", run: null, sets: [] },
    ];

    const summary = buildWeeklySummary({
      today: "2026-11-14",
      weekWorkouts,
      recentDates: ["2026-11-14", "2026-11-13", "2026-11-11"],
    });

    // fixtures의 3720은 세트와 맞지 않는 임의 값이라 실제 합계(2120)로 비교한다.
    expect(summary).toEqual({ ...SAMPLE_WEEKLY_SUMMARY, strengthVolumeKg: 2120 });
  });

  it("기록이 없는 주", () => {
    expect(buildWeeklySummary({ today: "2026-11-16", weekWorkouts: [], recentDates: [] })).toEqual({
      weekStart: "2026-11-16",
      workoutCount: 0,
      runDistanceMeters: 0,
      strengthVolumeKg: 0,
      streakDays: 0,
      activeDates: [],
    });
  });
});
