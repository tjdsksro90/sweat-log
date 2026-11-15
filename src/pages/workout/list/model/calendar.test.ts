import { describe, expect, it } from "vitest";

import { SAMPLE_WORKOUTS } from "@/entities/workout/model/fixtures";
import { buildMonthCalendar, getMonthRange } from "@/pages/workout/list/model/calendar";

describe("calendar", () => {
  it("윤년과 평년의 2월 말일을 계산한다", () => {
    expect(getMonthRange("2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
    expect(getMonthRange("2100-02").to).toBe("2100-02-28");
    expect(getMonthRange("2026-12").to).toBe("2026-12-31");
  });

  it("월요일 시작 달력은 필요한 주만 만들고 월 바깥은 빈 칸이다", () => {
    const cells = buildMonthCalendar("2026-11", []);
    expect(cells.length).toBe(42);
    expect(cells.slice(0, 6)).toEqual(Array(6).fill(null));
    expect(cells[6]?.date).toBe("2026-11-01");
    expect(cells[35]?.date).toBe("2026-11-30");
    expect(cells.slice(36)).toEqual(Array(6).fill(null));
    expect(buildMonthCalendar("2021-02", []).length).toBe(28);
    expect(buildMonthCalendar("2024-02", []).filter(Boolean).length).toBe(29);
  });

  it("같은 날의 운동 종류는 중복 없이 고정 순서로 표시한다", () => {
    const date = "2026-11-14";
    const workouts = (["other", "run", "strength", "run"] as const).map((kind) => ({
      ...SAMPLE_WORKOUTS[0],
      kind,
      workoutDate: date,
    }));
    const cells = buildMonthCalendar("2026-11", [...workouts, { ...SAMPLE_WORKOUTS[0], workoutDate: "2026-12-14" }]);
    expect(cells.find((cell) => cell?.date === date)?.kinds).toEqual(["run", "strength", "other"]);
    expect(cells.find((cell) => cell?.date === "2026-11-15")?.kinds).toEqual([]);
  });

  it("잘못된 월을 자동 보정하지 않는다", () => {
    for (const month of ["2026-00", "2026-13", "2026-1", "invalid", "2026-11-01"]) {
      expect(() => getMonthRange(month)).toThrow(RangeError);
      expect(() => buildMonthCalendar(month, [])).toThrow(RangeError);
    }
  });
});
