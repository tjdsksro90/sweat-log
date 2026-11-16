import { describe, expect, it } from "vitest";

import { buildRunningStats, getRecentMonths, hasRuns, type RunningStatsRun, toRunningStats } from "./running-stats";
import { getKstToday } from "./weekly-summary";

let sequence = 0;
const run = (workoutDate: string, distanceMeters: number, durationSeconds: number, id?: string): RunningStatsRun => {
  sequence++;
  return {
    workoutId: id ?? `run-${String(sequence).padStart(3, "0")}`,
    workoutDate,
    distanceMeters,
    durationSeconds,
    createdAt: `${workoutDate}T09:00:00.000Z`,
  };
};

const build = (runs: RunningStatsRun[], today = "2026-11-16") => buildRunningStats({ hasWorkouts: true, runs, today });

describe("getRecentMonths", () => {
  it("이번 달까지 12개월을 오래된 달부터 돌려주고 해를 넘긴다", () => {
    const months = getRecentMonths("2026-11-16");
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2025-12");
    expect(months.at(-1)).toBe("2026-11");
  });

  it("1월과 말일 기준에서도 달을 건너뛰지 않는다", () => {
    expect(getRecentMonths("2026-01-31", 3)).toEqual(["2025-11", "2025-12", "2026-01"]);
    expect(getRecentMonths("2026-03-31", 2)).toEqual(["2026-02", "2026-03"]);
  });
});

describe("buildRunningStats", () => {
  it("러닝이 없으면 모든 달이 0이고 개인 기록이 없다", () => {
    const stats = build([]);
    expect(stats.months).toHaveLength(12);
    expect(stats.months.every((month) => month.distanceMeters === 0 && month.runCount === 0)).toBe(true);
    expect(Object.values(stats.records).every((record) => record === null)).toBe(true);
    expect(hasRuns(stats)).toBe(false);
  });

  it("월 경계의 말일과 1일을 각자의 달에 넣는다", () => {
    const stats = build([run("2026-10-31", 3000, 900), run("2026-11-01", 5000, 1500)]);
    expect(stats.months.find((month) => month.month === "2026-10")).toEqual({
      month: "2026-10",
      distanceMeters: 3000,
      runCount: 1,
    });
    expect(stats.months.find((month) => month.month === "2026-11")).toEqual({
      month: "2026-11",
      distanceMeters: 5000,
      runCount: 1,
    });
  });

  it("12개월 창의 첫날은 넣고 그 전날과 기준일 뒤는 뺀다", () => {
    const stats = build([run("2025-11-30", 1000, 200), run("2025-12-01", 2000, 700), run("2026-11-17", 9000, 2700)]);
    expect(stats.months[0]).toEqual({ month: "2025-12", distanceMeters: 2000, runCount: 1 });
    expect(stats.months.reduce((sum, month) => sum + month.distanceMeters, 0)).toBe(2000);
    // 창 밖 러닝도 개인 기록에는 들어가고, 기준일 뒤 러닝은 어디에도 안 들어간다.
    expect(stats.records.longestDistance?.distanceMeters).toBe(2000);
    expect(stats.records.bestPace?.workoutDate).toBe("2025-11-30");
  });

  it("거리 0이나 시간 0인 행은 월 합계와 개인 기록에서 뺀다", () => {
    const stats = build([run("2026-11-02", 0, 600), run("2026-11-03", 3000, 0), run("2026-11-04", 2000, 720)]);
    expect(stats.months.at(-1)).toEqual({ month: "2026-11", distanceMeters: 2000, runCount: 1 });
    expect(stats.records.bestPace?.distanceMeters).toBe(2000);
    expect(stats.records.longestDuration?.durationSeconds).toBe(720);
  });

  it("최고 페이스는 1km 이상, 5km·10km 기록은 그 거리 이상에서만 고른다", () => {
    const sprint = run("2026-11-01", 999, 150); // 2'30"/km지만 1km 미만
    const exactlyOneKm = run("2026-11-02", 1000, 240); // 4'00"
    const fiveK = run("2026-11-03", 5000, 1500); // 5'00"
    const almostTenK = run("2026-11-04", 9999, 2400); // 4'00"이지만 10km 미만
    const tenK = run("2026-11-05", 10000, 3300); // 5'30"
    const stats = build([sprint, exactlyOneKm, fiveK, almostTenK, tenK]);
    expect(stats.records.bestPace?.workoutId).toBe(exactlyOneKm.workoutId);
    expect(stats.records.bestPace5k?.workoutId).toBe(almostTenK.workoutId);
    expect(stats.records.bestPace10k?.workoutId).toBe(tenK.workoutId);
  });

  it("10km 이상이 없으면 그 기록만 비어 있다", () => {
    const stats = build([run("2026-11-01", 5000, 1500)]);
    expect(stats.records.bestPace10k).toBeNull();
    expect(stats.records.bestPace5k).not.toBeNull();
    expect(hasRuns(stats)).toBe(true);
  });

  it("같은 값이면 먼저 세운 기록을 남긴다", () => {
    const first = run("2026-10-01", 5000, 1500);
    const later = run("2026-11-01", 10000, 3000); // 같은 5'00"
    const sameDistance = run("2026-11-02", 10000, 3600);
    const stats = build([later, sameDistance, first]);
    expect(stats.records.bestPace?.workoutId).toBe(first.workoutId);
    expect(stats.records.longestDistance?.workoutId).toBe(later.workoutId);
    expect(stats.records.longestDuration?.workoutId).toBe(sameDistance.workoutId);
  });

  it("한국 시간 자정이 지나면 UTC로는 전날이어도 새 달로 센다", () => {
    // 2026-10-31T15:00Z는 한국 시간 11월 1일 0시
    const today = getKstToday(new Date("2026-10-31T15:00:00.000Z"));
    expect(today).toBe("2026-11-01");
    const stats = build([run("2026-11-01", 4000, 1400)], today);
    expect(stats.months.at(-1)).toEqual({ month: "2026-11", distanceMeters: 4000, runCount: 1 });
    // 1초 전(한국 시간 10월 31일 23:59:59)에는 아직 10월이고 11월 1일 러닝은 기준일 뒤다.
    const before = getKstToday(new Date("2026-10-31T14:59:59.000Z"));
    expect(before).toBe("2026-10-31");
    const earlier = build([run("2026-11-01", 4000, 1400)], before);
    expect(earlier.months.at(-1)).toEqual({ month: "2026-10", distanceMeters: 0, runCount: 0 });
    expect(hasRuns(earlier)).toBe(false);
  });
});

describe("toRunningStats", () => {
  it("DB 행을 화면 모양으로 옮기고 모르는 기록 종류는 무시한다", () => {
    const stats = toRunningStats({
      hasWorkouts: true,
      monthRows: [
        { month: "2026-10-01", distance_meters: 0, run_count: 0 },
        { month: "2026-11-01", distance_meters: 12800, run_count: 3 },
      ],
      recordRows: [
        {
          record_type: "best_pace_10k",
          workout_id: "w1",
          workout_date: "2026-11-02",
          distance_meters: 10000,
          duration_seconds: 3000,
        },
        {
          record_type: "unknown",
          workout_id: "w2",
          workout_date: "2026-11-03",
          distance_meters: 1,
          duration_seconds: 1,
        },
      ],
    });
    expect(stats.months).toEqual([
      { month: "2026-10", distanceMeters: 0, runCount: 0 },
      { month: "2026-11", distanceMeters: 12800, runCount: 3 },
    ]);
    expect(stats.records.bestPace10k).toEqual({
      workoutId: "w1",
      workoutDate: "2026-11-02",
      distanceMeters: 10000,
      durationSeconds: 3000,
    });
    expect(stats.records.bestPace).toBeNull();
    expect(hasRuns(stats)).toBe(false);
  });
});
