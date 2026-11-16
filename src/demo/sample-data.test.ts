import { describe, expect, it } from "vitest";

import { addDays, getKstToday } from "@/entities/workout/model/weekly-summary";
import { toWorkoutDetail } from "@/entities/workout/model/workout-mappers";
import { parseWorkoutInput } from "@/features/workout/model/save-workout-input";

import { createSampleData, DEMO_CREW, DEMO_USER } from "./sample-data";

describe("데모 샘플", () => {
  it.each([
    "2026-11-15T15:00:00Z",
    "2026-11-15T23:59:59Z",
    "2026-11-16T00:30:00Z",
    "2026-11-16T14:59:59Z",
  ])("한국 자정과 오전에도 기록·댓글이 미래에 생성되지 않는다: %s", (instant) => {
    const now = new Date(instant);
    const sample = createSampleData(now);
    for (const row of sample.workouts) {
      expect(Date.parse(row.created_at)).toBeLessThanOrEqual(now.getTime());
      for (const comment of sample.comments[row.id] ?? []) {
        expect(Date.parse(comment.createdAt)).toBeGreaterThanOrEqual(Date.parse(row.created_at));
        expect(Date.parse(comment.createdAt)).toBeLessThanOrEqual(now.getTime());
      }
    }
    expect(sample.workouts.some((row) => row.workout_date === getKstToday(now))).toBe(true);
  });

  it.each([
    ["2026-11-15T14:59:59Z", "2026-11-15"],
    ["2026-11-15T15:00:00Z", "2026-11-16"],
    ["2026-12-31T15:00:00Z", "2027-01-01"],
    ["2028-02-29T15:00:00Z", "2028-03-01"],
  ])("한국 날짜와 월·연도 경계를 따른다: %s", (instant, today) => {
    const sample = createSampleData(new Date(instant));
    const mine = sample.workouts.filter((row) => row.user_id === DEMO_USER.id);
    const dates = new Set(mine.map((row) => row.workout_date));
    expect([...dates].sort().at(-1)).toBe(today);
    expect([...dates].sort()[0]).toBe(addDays(today, -27));
    for (let day = 0; day < 5; day++) expect(dates.has(addDays(today, -day))).toBe(true);
    expect(new Set(mine.map((row) => row.kind))).toEqual(new Set(["run", "strength", "other"]));
    expect(mine.every((row) => row.workout_date <= today)).toBe(true);
  });

  it("한 크루에 나와 친구 세 명이 있고 모든 샘플이 실제 입력 계약에 맞는다", () => {
    const now = new Date("2026-11-16T00:00:00Z");
    const sample = createSampleData(now);
    expect(DEMO_CREW.members).toHaveLength(4);
    expect(DEMO_CREW.members.filter((member) => member.userId !== DEMO_USER.id)).toHaveLength(3);
    expect(Object.values(sample.comments).flat()).toHaveLength(3);
    for (const row of sample.workouts) {
      const detail = toWorkoutDetail(row, DEMO_USER.id);
      expect(
        parseWorkoutInput(
          {
            id: detail.id,
            kind: detail.kind,
            workoutDate: detail.workoutDate,
            title: detail.title,
            memo: detail.memo,
            placeName: detail.placeName,
            crewId: detail.crew?.id ?? null,
            companionIds: detail.companions.map((person) => person.id),
            durationSeconds: detail.durationSeconds,
            run: detail.run,
            exercises: detail.exercises,
          },
          getKstToday(now),
        ).ok,
      ).toBe(true);
    }
    expect(createSampleData(now)).toEqual(sample);
  });
});
