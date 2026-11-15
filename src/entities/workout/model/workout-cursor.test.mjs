import { decodeWorkoutCursor, encodeWorkoutCursor } from "@/entities/workout/model/workout-cursor";

import assert from "node:assert/strict";
import { test } from "node:test";

test("커서는 URL에 그대로 넣을 수 있고 원래 값으로 돌아온다", () => {
  const cursor = {
    workoutDate: "2026-11-14",
    createdAt: "2026-11-14T06:10:00.123456+00:00",
    id: "00000000-0000-0000-0000-000000000101",
  };
  const encoded = encodeWorkoutCursor(cursor);

  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeWorkoutCursor(encoded), cursor);
});

test("망가진 커서는 null", () => {
  assert.equal(decodeWorkoutCursor("not a cursor"), null);
  assert.equal(decodeWorkoutCursor(""), null);
  assert.equal(decodeWorkoutCursor(btoa(JSON.stringify(["2026-11-14", 1, "x"]))), null);
  assert.equal(decodeWorkoutCursor(btoa(JSON.stringify({ a: 1 }))), null);
});
