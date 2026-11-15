import { formatDistance, formatDuration, formatPace, getPaceSecondsPerKm } from "@/entities/workout/model/pace";

import assert from "node:assert/strict";
import { test } from "node:test";

test("거리와 시간으로 1km 페이스를 계산한다", () => {
  assert.equal(getPaceSecondsPerKm(5000, 1650), 330);
  assert.equal(getPaceSecondsPerKm(10000, 3000), 300);
});

test("거리나 시간이 0 이하면 페이스를 계산하지 않는다", () => {
  assert.equal(getPaceSecondsPerKm(0, 1000), null);
  assert.equal(getPaceSecondsPerKm(5000, 0), null);
});

test("페이스를 분'초\" 형식으로 보여준다", () => {
  assert.equal(formatPace(330), "5'30\"");
  assert.equal(formatPace(305), "5'05\"");
  assert.equal(formatPace(null), "-");
});

test("거리와 시간을 읽기 쉽게 보여준다", () => {
  assert.equal(formatDistance(5230), "5.23km");
  assert.equal(formatDuration(330), "5:30");
  assert.equal(formatDuration(3725), "1:02:05");
});
