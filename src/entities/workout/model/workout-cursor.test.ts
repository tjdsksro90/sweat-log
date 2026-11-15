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
});
