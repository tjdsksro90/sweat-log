import { describe, expect, it } from "vitest";

import { formatDistance, formatDuration, formatPace, getPaceSecondsPerKm } from "@/entities/workout/model/pace";

describe("getPaceSecondsPerKm", () => {
  it("거리와 시간으로 1km 페이스를 계산한다", () => {
    expect(getPaceSecondsPerKm(5000, 1650)).toBe(330);
    expect(getPaceSecondsPerKm(10000, 3000)).toBe(300);
  });

  it("거리나 시간이 0 이하면 페이스를 계산하지 않는다", () => {
    expect(getPaceSecondsPerKm(0, 1000)).toBeNull();
    expect(getPaceSecondsPerKm(5000, 0)).toBeNull();
  });
});

describe("formatPace", () => {
  it("페이스를 분'초\" 형식으로 보여준다", () => {
    expect(formatPace(330)).toBe("5'30\"");
    expect(formatPace(305)).toBe("5'05\"");
    expect(formatPace(null)).toBe("-");
  });
});

describe("formatDistance, formatDuration", () => {
  it("거리와 시간을 읽기 쉽게 보여준다", () => {
    expect(formatDistance(5230)).toBe("5.23km");
    expect(formatDuration(330)).toBe("5:30");
    expect(formatDuration(3725)).toBe("1:02:05");
  });
});
