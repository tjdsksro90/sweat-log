import { SAMPLE_WEEKLY_SUMMARY } from "@/entities/workout/model/fixtures";
import {
  addDays,
  buildWeeklySummary,
  countStreakDays,
  getKstToday,
  getWeekStart,
} from "@/entities/workout/model/weekly-summary";

import assert from "node:assert/strict";
import { test } from "node:test";

test("한국 시간으로 오늘 날짜를 구한다", () => {
  // UTC 15:00 = 한국 자정
  assert.equal(getKstToday(new Date("2026-11-14T14:59:59Z")), "2026-11-14");
  assert.equal(getKstToday(new Date("2026-11-14T15:00:00Z")), "2026-11-15");
});

test("주는 월요일에 시작한다", () => {
  assert.equal(getWeekStart("2026-11-09"), "2026-11-09"); // 월
  assert.equal(getWeekStart("2026-11-14"), "2026-11-09"); // 토
  assert.equal(getWeekStart("2026-11-15"), "2026-11-09"); // 일
  assert.equal(getWeekStart("2026-11-16"), "2026-11-16"); // 다음 주 월
  assert.equal(getWeekStart("2027-01-01"), "2026-12-28"); // 해를 넘긴다
});

test("날짜 더하기는 월·해를 넘긴다", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
});

test("연속 운동 일수는 오늘, 오늘 안 했으면 어제부터 센다", () => {
  const dates = ["2026-11-14", "2026-11-13", "2026-11-13", "2026-11-11"];
  assert.equal(countStreakDays(dates, "2026-11-14"), 2);
  assert.equal(countStreakDays(dates, "2026-11-15"), 2);
  assert.equal(countStreakDays(dates, "2026-11-16"), 0);
  assert.equal(countStreakDays([], "2026-11-14"), 0);
});

test("이번 주 기록을 요약한다", () => {
  const weekWorkouts = [
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

  assert.deepEqual(summary, { ...SAMPLE_WEEKLY_SUMMARY, strengthVolumeKg: 2120 });
});

test("기록이 없는 주", () => {
  assert.deepEqual(buildWeeklySummary({ today: "2026-11-16", weekWorkouts: [], recentDates: [] }), {
    weekStart: "2026-11-16",
    workoutCount: 0,
    runDistanceMeters: 0,
    strengthVolumeKg: 0,
    streakDays: 0,
    activeDates: [],
  });
});
