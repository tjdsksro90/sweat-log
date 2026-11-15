import { describe, expect, it } from "vitest";

import { decodeWorkoutCursor, encodeWorkoutCursor } from "@/entities/workout/model/workout-cursor";

describe("encodeWorkoutCursor, decodeWorkoutCursor", () => {
  it("커서는 URL에 그대로 넣을 수 있고 원래 값으로 돌아온다", () => {
    const cursor = {
      workoutDate: "2026-11-14",
      createdAt: "2026-11-14T06:10:00.123456+00:00",
      id: "00000000-0000-0000-0000-000000000101",
    };
    const encoded = encodeWorkoutCursor(cursor);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeWorkoutCursor(encoded)).toEqual(cursor);
  });

  it("망가진 커서는 null", () => {
    expect(decodeWorkoutCursor("not a cursor")).toBeNull();
    expect(decodeWorkoutCursor("")).toBeNull();
    expect(decodeWorkoutCursor(btoa(JSON.stringify(["2026-11-14", 1, "x"])))).toBeNull();
    expect(decodeWorkoutCursor(btoa(JSON.stringify({ a: 1 })))).toBeNull();
  });

  it("문자열 3개라도 날짜·시각·UUID 형식이 틀리면 null", () => {
    const valid = ["2026-11-14", "2026-11-14T06:10:00.123456+00:00", "00000000-0000-0000-0000-000000000101"];
    const withPart = (index: number, part: string) =>
      encodeWorkoutCursor({
        workoutDate: index === 0 ? part : valid[0],
        createdAt: index === 1 ? part : valid[1],
        id: index === 2 ? part : valid[2],
      });

    expect(decodeWorkoutCursor(withPart(0, "2026-02-30"))).toBeNull();
    expect(decodeWorkoutCursor(withPart(0, "yesterday"))).toBeNull();
    expect(decodeWorkoutCursor(withPart(1, "2026-11-14"))).toBeNull();
    expect(decodeWorkoutCursor(withPart(1, "2026-13-14T06:10:00+00:00"))).toBeNull();
    expect(decodeWorkoutCursor(withPart(1, "2026-11-14T25:10:00+00:00"))).toBeNull();
    expect(decodeWorkoutCursor(withPart(2, "not-a-uuid"))).toBeNull();
  });

  it("마이크로초가 없거나 Z로 끝나는 시각도 받는다", () => {
    for (const createdAt of ["2026-11-14T06:10:00+00:00", "2026-11-14T06:10:00.5Z", "2026-11-14T15:10:00+09:00"]) {
      const cursor = { workoutDate: "2026-11-14", createdAt, id: "00000000-0000-0000-0000-000000000101" };
      expect(decodeWorkoutCursor(encodeWorkoutCursor(cursor))).toEqual(cursor);
    }
  });
});
