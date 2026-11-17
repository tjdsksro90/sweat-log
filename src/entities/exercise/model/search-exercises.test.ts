import { describe, expect, it } from "vitest";

import { EXERCISES } from "./exercises";
import { findExercise, normalizeExerciseName, searchExercises } from "./search-exercises";

describe("헬스 종목 사전 검색", () => {
  it("6개 부위의 30~60개 종목을 중복 없이 제공한다", () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(30);
    expect(EXERCISES.length).toBeLessThanOrEqual(60);
    expect(new Set(EXERCISES.map((e) => e.name)).size).toBe(EXERCISES.length);
    expect(new Set(EXERCISES.map((e) => e.bodyPart)).size).toBe(6);
  });
  it.each(["벤치", "ㅂㅊ", " ㅂ ㅊ ", "벤치\t프레스", "벤치\u00a0프레스"])("%s로 벤치프레스를 찾는다", (query) => {
    expect(searchExercises(query).some((e) => e.name === "벤치프레스")).toBe(true);
  });
  it("부분 이름과 부위 검색, 빈 검색과 미등록 이름을 처리한다", () => {
    expect(searchExercises("하체").every((e) => e.bodyPart === "하체")).toBe(true);
    expect(searchExercises("로우").length).toBeGreaterThan(0);
    expect(searchExercises(" ")).toHaveLength(EXERCISES.length);
    expect(searchExercises("내가 만든 동작")).toEqual([]);
    expect(normalizeExerciseName(" \t벤치　프레스\n")).toBe("벤치프레스");
  });
  it("정확히 선택하거나 입력한 맨몸 종목만 힌트 대상으로 찾는다", () => {
    expect(findExercise("풀 업")?.bodyweight).toBe(true);
    expect(findExercise("벤치프레스")?.bodyweight).toBe(false);
    expect(findExercise("풀")).toBeUndefined();
    expect(findExercise("나만의 풀업")).toBeUndefined();
  });
});
