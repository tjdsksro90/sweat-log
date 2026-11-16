import { describe, expect, it } from "vitest";

import { SAMPLE_RUNNING_STATS } from "@/entities/workout/model/fixtures";

import {
  formatMonthLong,
  formatMonthShort,
  getBusiestMonth,
  MIN_BAR_PERCENT,
  toBarPercent,
  toRunningRecordRows,
} from "./running-stats-view";

describe("러닝 통계 표시 값", () => {
  it("월 이름을 한국어로 쓴다", () => {
    expect(formatMonthShort("2026-01")).toBe("1월");
    expect(formatMonthLong("2025-12")).toBe("2025년 12월");
  });

  it("막대 높이는 최대 달 기준이고, 0은 0, 아주 작은 값도 보이게 최소 높이를 둔다", () => {
    expect(toBarPercent(0, 30000)).toBe(0);
    expect(toBarPercent(30000, 30000)).toBe(100);
    expect(toBarPercent(15000, 30000)).toBe(50);
    expect(toBarPercent(100, 30000)).toBe(MIN_BAR_PERCENT);
    expect(toBarPercent(0, 0)).toBe(0);
  });

  it("가장 많이 달린 달은 거리가 있는 달 중에서, 같으면 먼저 온 달", () => {
    expect(getBusiestMonth(SAMPLE_RUNNING_STATS.months)?.month).toBe("2026-08");
    expect(
      getBusiestMonth([
        { month: "2026-10", distanceMeters: 5000, runCount: 1 },
        { month: "2026-11", distanceMeters: 5000, runCount: 1 },
      ])?.month,
    ).toBe("2026-10");
    expect(getBusiestMonth([{ month: "2026-11", distanceMeters: 0, runCount: 0 }])).toBeNull();
  });

  it("개인 기록을 정해진 순서로, 페이스는 pace.ts로 계산해 표시한다", () => {
    const rows = toRunningRecordRows(SAMPLE_RUNNING_STATS.records);
    expect(rows.map((row) => row.type)).toEqual([
      "bestPace",
      "bestPace5k",
      "bestPace10k",
      "longestDistance",
      "longestDuration",
    ]);
    expect(rows[0]).toMatchObject({ value: `4'40"`, unit: "/km", detail: "2026-11-11 · 3.00km" });
    expect(rows[1]).toMatchObject({ value: `5'00"`, detail: "2026-08-03 · 5.20km" });
    expect(rows[2]).toEqual({
      type: "bestPace10k",
      label: "10km 이상 최고 페이스",
      value: "-",
      detail: "10km 이상 달리면 기록돼요",
      href: null,
    });
    expect(rows[3]).toMatchObject({ value: "9.10km", detail: "2026-08-24 · 55:00", href: "/workouts/run-long" });
    expect(rows[4]).toMatchObject({ value: "55:00", detail: "2026-08-24 · 9.10km" });
  });
});
