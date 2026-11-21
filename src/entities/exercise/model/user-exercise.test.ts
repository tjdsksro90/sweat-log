import { describe, expect, it } from "vitest";

import { findExercise, searchExercises } from "./search-exercises";
import {
  findDuplicateExercise,
  findRecordOnlyExercises,
  getUserExerciseErrorMessage,
  parseUserExerciseInput,
  toUserExercises,
  type UserExercise,
} from "./user-exercise";

const KICKBACK: UserExercise = {
  bodyPart: "팔",
  bodyweight: false,
  id: "00000000-0000-4000-8000-000000000001",
  name: "케이블 킥백",
};
const HANGING: UserExercise = {
  bodyPart: "코어",
  bodyweight: true,
  id: "00000000-0000-4000-8000-000000000002",
  name: "드래곤 플래그",
};

describe("내 종목 입력 검증", () => {
  it("앞뒤 공백을 빼고 부위·맨몸을 확인한다", () => {
    expect(parseUserExerciseInput({ bodyPart: "팔", bodyweight: false, name: "  케이블 킥백 " })).toEqual({
      input: { bodyPart: "팔", bodyweight: false, id: undefined, name: "케이블 킥백" },
      ok: true,
    });
    expect(parseUserExerciseInput({ bodyPart: null, bodyweight: false, name: "킥백" })).toEqual({
      error: "부위를 골라 주세요.",
      ok: false,
    });
    expect(parseUserExerciseInput({ bodyPart: "엉덩이" as "팔", bodyweight: false, name: "킥백" }).ok).toBe(false);
  });

  it("이름은 코드 포인트로 1~50자다", () => {
    expect(parseUserExerciseInput({ bodyPart: "팔", bodyweight: false, name: " \t　" }).ok).toBe(false);
    expect(parseUserExerciseInput({ bodyPart: "팔", bodyweight: false, name: "가".repeat(51) }).ok).toBe(false);
    expect(parseUserExerciseInput({ bodyPart: "팔", bodyweight: false, name: "💪".repeat(50) }).ok).toBe(true);
  });

  it("수정 id는 UUID만 받는다", () => {
    expect(parseUserExerciseInput({ bodyPart: "팔", bodyweight: false, id: "x", name: "킥백" }).ok).toBe(false);
    expect(parseUserExerciseInput({ bodyPart: "팔", bodyweight: false, id: KICKBACK.id, name: "킥백" }).ok).toBe(true);
  });

  it("DB 오류를 안내 문구로 바꾼다", () => {
    expect(getUserExerciseErrorMessage({ message: "too_many_exercises" })).toContain("100개");
    expect(getUserExerciseErrorMessage({ code: "23505" })).toContain("이미 있어요");
  });
});

describe("내 종목 중복", () => {
  it("공백을 뺀 이름이 사전 종목이나 내 다른 종목과 같으면 그 종목을 돌려준다", () => {
    expect(findDuplicateExercise("벤치 프레스", [KICKBACK])).toMatchObject({ name: "벤치프레스" });
    expect(findDuplicateExercise("케이블킥백", [KICKBACK])).toMatchObject({ userExerciseId: KICKBACK.id });
    expect(findDuplicateExercise("케이블 킥 백", [KICKBACK], KICKBACK.id)).toBeUndefined();
    expect(findDuplicateExercise("케이블 푸시다운", [KICKBACK])).toBeUndefined();
  });

  it("대소문자는 다른 이름으로 본다", () => {
    const upper = { ...KICKBACK, name: "Cable Kickback" };
    expect(findDuplicateExercise("cable kickback", [upper])).toBeUndefined();
  });
});

describe("내 종목 검색", () => {
  it("내 종목을 사전 종목 앞에 두고 초성·부위로 찾는다", () => {
    expect(searchExercises("ㅋㅇㅂ", [KICKBACK])[0]).toMatchObject({
      name: "케이블 킥백",
      userExerciseId: KICKBACK.id,
    });
    expect(searchExercises("코어", [HANGING])[0]).toMatchObject({ name: "드래곤 플래그" });
    expect(searchExercises("팔", [KICKBACK]).every((exercise) => exercise.bodyPart === "팔")).toBe(true);
  });

  it("맨몸 여부를 내 종목에서도 찾는다", () => {
    expect(findExercise("드래곤플래그", [HANGING])?.bodyweight).toBe(true);
    expect(findExercise("드래곤플래그")).toBeUndefined();
  });

  it("사전과 이름이 같은 내 종목은 사전 종목 하나만 남긴다", () => {
    const same = { ...KICKBACK, name: "벤치 프레스" };
    expect(searchExercises("벤치", [same]).filter((exercise) => exercise.name.includes("벤치"))).toHaveLength(2);
    expect(searchExercises("벤치", [same]).some((exercise) => exercise.userExerciseId)).toBe(false);
  });
});

describe("기록에만 있는 종목", () => {
  it("사전·내 종목에 없는 이름만 남긴다", () => {
    const names = [
      { name: "스쿼트", workoutCount: 5 },
      { name: "케이블킥백", workoutCount: 3 },
      { name: "드래곤 플래그", workoutCount: 2 },
      { name: "벤치 프레스", workoutCount: 1 },
    ];
    expect(findRecordOnlyExercises(names, [KICKBACK])).toEqual([{ name: "드래곤 플래그", workoutCount: 2 }]);
  });

  it("모르는 부위의 행은 읽을 때 뺀다", () => {
    expect(
      toUserExercises([
        { body_part: "팔", bodyweight: false, id: KICKBACK.id, name: "킥백" },
        { body_part: "엉덩이", bodyweight: false, id: HANGING.id, name: "힙" },
      ]),
    ).toHaveLength(1);
  });
});

describe("Server Action 입력 모양", () => {
  it.each([
    null,
    "케이블 킥백",
    { bodyPart: "팔", bodyweight: false },
    { bodyPart: "팔", bodyweight: false, name: 123 },
    { bodyPart: ["팔"], bodyweight: false, name: "킥백" },
    { bodyPart: "팔", bodyweight: "true", name: "킥백" },
    { bodyPart: "팔", bodyweight: false, id: 1, name: "킥백" },
  ])("%j는 던지지 않고 안내 문구를 돌려준다", (input) => {
    const result = parseUserExerciseInput(input as never);
    expect(result.ok).toBe(false);
    expect(result).toHaveProperty("error", expect.any(String));
  });
});
