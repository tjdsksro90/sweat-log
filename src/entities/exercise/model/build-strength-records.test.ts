import { describe, expect, it } from "vitest";

import { buildStrengthRecords } from "./build-strength-records";
import type { StrengthRecordWorkout } from "./strength-records";

const workout = (overrides: Partial<StrengthRecordWorkout> = {}): StrengthRecordWorkout => ({
  workoutId: "b",
  workoutDate: "2026-11-16",
  createdAt: "2026-11-16T01:00:00Z",
  sets: [{ name: "벤치프레스", weightKg: 80 }],
  ...overrides,
});
const today = "2026-11-17";

describe("데모 최고 무게 집계(SQL과 같은 규칙)", () => {
  it("빈 목록과 미래 계획은 제외한다", () => {
    expect(buildStrengthRecords([], today)).toEqual([]);
    expect(buildStrengthRecords([workout({ workoutDate: "2026-11-18" })], today)).toEqual([]);
  });
  it("공백 차이를 합치고 같은 운동의 여러 세트는 한 번만 센다", () => {
    const result = buildStrengthRecords(
      [
        workout({
          sets: [
            { name: " 벤치\t프레스 ", weightKg: 60 },
            { name: "벤치프레스", weightKg: 82.5 },
          ],
        }),
        workout({ workoutId: "a", sets: [{ name: "벤치\u00a0프레스", weightKg: 70 }] }),
      ],
      today,
    );
    expect(result).toEqual([
      { exerciseName: "벤치프레스", maxWeightKg: 82.5, workoutDate: "2026-11-16", workoutId: "b", workoutCount: 2 },
    ]);
  });
  it("동점은 날짜, 작성 시각, id 순으로 최초 기록을 고른다", () => {
    const input = [workout(), workout({ workoutId: "a" }), workout({ workoutId: "early", workoutDate: "2026-11-15" })];
    expect(buildStrengthRecords(input, today)[0].workoutId).toBe("early");
    expect(buildStrengthRecords(input.slice(0, 2).reverse(), today)[0].workoutId).toBe("a");
    expect(
      buildStrengthRecords(
        [workout(), workout({ workoutId: "earlier-time", createdAt: "2026-11-16T00:00:00Z" })],
        today,
      )[0].workoutId,
    ).toBe("earlier-time");
  });
  it("맨몸 null과 0kg를 구분하고 추가 중량이 있으면 그 무게를 고른다", () => {
    const body = workout({ sets: [{ name: "풀업", weightKg: null }] });
    expect(buildStrengthRecords([body], today)[0].maxWeightKg).toBeNull();
    expect(
      buildStrengthRecords([body, workout({ workoutId: "zero", sets: [{ name: "풀업", weightKg: 0 }] })], today)[0]
        .maxWeightKg,
    ).toBe(0);
    expect(
      buildStrengthRecords([body, workout({ workoutId: "loaded", sets: [{ name: "풀업", weightKg: 20 }] })], today)[0]
        .maxWeightKg,
    ).toBe(20);
  });
  it("1001개 기록의 최고 무게도 포함하며 많이 한 종목을 우선한다", () => {
    const many = Array.from({ length: 1001 }, (_, i) =>
      workout({ workoutId: String(i), sets: [{ name: "스쿼트", weightKg: i === 1000 ? 321.25 : 10 }] }),
    );
    const result = buildStrengthRecords([workout(), ...many], today, 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ exerciseName: "스쿼트", maxWeightKg: 321.25, workoutCount: 1001 });
  });
  it("허용하지 않는 무게·빈 이름을 거르고 결과 수를 1~20으로 제한한다", () => {
    const invalid = workout({
      sets: [-1, 1001, NaN, Infinity]
        .map((weightKg) => ({ name: "잘못된 종목", weightKg }))
        .concat([{ name: " \t ", weightKg: 10 }]),
    });
    expect(buildStrengthRecords([invalid], today)).toEqual([]);
    const lots = workout({ sets: Array.from({ length: 25 }, (_, i) => ({ name: `종목${i}`, weightKg: 1000 })) });
    expect(buildStrengthRecords([lots], today)).toHaveLength(5);
    expect(buildStrengthRecords([lots], today, 100)).toHaveLength(20);
    expect(buildStrengthRecords([lots], today, 0)).toHaveLength(1);
  });
});
