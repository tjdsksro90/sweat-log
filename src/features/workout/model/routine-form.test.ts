import { describe, expect, it } from "vitest";

import type { RoutineExercise } from "@/entities/routine/model/routine";

import {
  canAppendRoutine,
  createRoutineFormValues,
  getRoutineErrorMessage,
  hasEnteredExercises,
  loadRoutineExercises,
  parseRoutineInput,
  toRoutineInput,
  validateRoutineForm,
} from "./routine-form";
import {
  addExercise,
  createEmptyExercise,
  MAX_EXERCISES,
  MAX_SETS_PER_EXERCISE,
  renameExercise,
  updateSet,
} from "./workout-form";

const LOWER_BODY: RoutineExercise[] = [
  {
    name: "스쿼트",
    sets: [
      { reps: 10, weightKg: 60 },
      { reps: 8, weightKg: 70.5 },
    ],
  },
  { name: "푸시업", sets: [{ reps: 15, weightKg: null }] },
];

const toPlain = (exercises: ReturnType<typeof loadRoutineExercises>) =>
  exercises.map((exercise) => ({ name: exercise.name, sets: exercise.sets.map((set) => [set.weightKg, set.reps]) }));

const exercisesOf = (count: number): RoutineExercise[] =>
  Array.from({ length: count }, (_, index) => ({ name: `종목${index + 1}`, sets: [{ reps: 10, weightKg: 20 }] }));

describe("루틴 → 폼 입력", () => {
  it("무게·횟수를 입력 칸 문자열로 바꾸고 맨몸은 빈 칸으로 둔다", () => {
    const values = createRoutineFormValues({ exercises: LOWER_BODY, name: "하체 데이" });

    expect(values.name).toBe("하체 데이");
    expect(toPlain(values.exercises)).toEqual([
      {
        name: "스쿼트",
        sets: [
          ["60", "10"],
          ["70.5", "8"],
        ],
      },
      { name: "푸시업", sets: [["", "15"]] },
    ]);
  });

  it("종목이 없으면 빈 종목 하나로 시작한다", () => {
    const values = createRoutineFormValues();
    expect(values.id).toBeNull();
    expect(toPlain(values.exercises)).toEqual([{ name: "", sets: [["", ""]] }]);
  });

  it("기록 제목이 루틴 이름 상한보다 길면 잘라서 채운다", () => {
    expect(createRoutineFormValues({ name: `  ${"가".repeat(50)}  ` }).name).toHaveLength(40);
  });

  it("이모지가 걸쳐 있어도 코드 포인트 단위로 잘라 반쪽 문자를 남기지 않는다", () => {
    const name = createRoutineFormValues({ name: `${"가".repeat(39)}💪💪` }).name;
    expect(name).toBe(`${"가".repeat(39)}💪`);
    expect(name.isWellFormed()).toBe(true);
  });

  it("잘라서 끝에 남은 공백은 지운다", () => {
    expect(createRoutineFormValues({ name: `${"가".repeat(39)} 나` }).name).toBe("가".repeat(39));
  });

  it("불러올 때마다 새 key를 만들어, 같은 루틴을 두 번 붙여도 key가 겹치지 않는다", () => {
    const once = loadRoutineExercises([], LOWER_BODY, "replace");
    const twice = loadRoutineExercises(once, LOWER_BODY, "append");
    const keys = twice.flatMap((exercise) => [exercise.key, ...exercise.sets.map((set) => set.key)]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("기록 폼에 불러오기", () => {
  const typed = () => {
    const values = { exercises: [createEmptyExercise()] };
    const [exercise] = values.exercises;
    return updateSet(renameExercise(values, exercise.key, "벤치프레스"), exercise.key, exercise.sets[0].key, {
      reps: "5",
      weightKg: "80",
    }).exercises;
  };

  it("처음 놓인 빈 종목만 있으면 묻지 않는다", () => {
    expect(hasEnteredExercises([createEmptyExercise()])).toBe(false);
    expect(hasEnteredExercises(typed())).toBe(true);
  });

  it("횟수만 적어도 입력한 것으로 본다", () => {
    const [exercise] = [createEmptyExercise()];
    const values = updateSet({ exercises: [exercise] }, exercise.key, exercise.sets[0].key, { reps: "3" });
    expect(hasEnteredExercises(values.exercises)).toBe(true);
  });

  it("덮어쓰기는 적은 종목을 루틴 구성으로 바꾼다", () => {
    expect(toPlain(loadRoutineExercises(typed(), LOWER_BODY, "replace")).map((exercise) => exercise.name)).toEqual([
      "스쿼트",
      "푸시업",
    ]);
  });

  it("뒤에 붙이기는 적은 종목을 두고 루틴 종목을 이어 붙인다", () => {
    expect(toPlain(loadRoutineExercises(typed(), LOWER_BODY, "append")).map((exercise) => exercise.name)).toEqual([
      "벤치프레스",
      "스쿼트",
      "푸시업",
    ]);
  });

  it("뒤에 붙일 때 아무것도 안 적은 종목 칸은 버린다", () => {
    const current = addExercise({ exercises: typed() }).exercises;
    expect(current).toHaveLength(2);
    expect(loadRoutineExercises(current, LOWER_BODY, "append")).toHaveLength(3);
  });

  it("뒤에 붙여 종목 상한을 넘으면 붙일 수 없다고 알린다", () => {
    expect(canAppendRoutine(typed(), exercisesOf(MAX_EXERCISES - 1))).toBe(true);
    expect(canAppendRoutine(typed(), exercisesOf(MAX_EXERCISES))).toBe(false);
    expect(loadRoutineExercises(typed(), exercisesOf(MAX_EXERCISES), "append")).toHaveLength(MAX_EXERCISES);
  });

  it("불러온 값을 고쳐도 루틴은 바뀌지 않는다", () => {
    const routine = structuredClone(LOWER_BODY);
    const loaded = loadRoutineExercises([], routine, "replace");
    updateSet({ exercises: loaded }, loaded[0].key, loaded[0].sets[0].key, { weightKg: "100" });
    loaded[0].name = "프론트 스쿼트";
    expect(routine).toEqual(LOWER_BODY);
  });
});

describe("루틴 검증", () => {
  it("폼 값을 RoutineInput으로 바꾼다", () => {
    const result = toRoutineInput({ ...createRoutineFormValues({ exercises: LOWER_BODY }), name: "  하체 데이 " });
    expect(result).toEqual({ input: { exercises: LOWER_BODY, name: "하체 데이" }, ok: true });
  });

  it("수정이면 id를 넣는다", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const result = toRoutineInput(createRoutineFormValues({ exercises: LOWER_BODY, id, name: "하체" }));
    expect(result.ok && result.input.id).toBe(id);
  });

  it("이름은 비울 수 없고 40자까지다", () => {
    const values = createRoutineFormValues({ exercises: LOWER_BODY });
    expect(validateRoutineForm({ ...values, name: "   " }).name).toBe("루틴 이름을 적어 주세요.");
    expect(validateRoutineForm({ ...values, name: "가".repeat(40) }).name).toBeUndefined();
    expect(validateRoutineForm({ ...values, name: "가".repeat(41) }).name).toBe("루틴 이름은 40자까지예요.");
  });

  it("이름 길이는 DB char_length처럼 이모지를 한 글자로 센다", () => {
    const values = createRoutineFormValues({ exercises: LOWER_BODY });
    expect("💪".repeat(40)).toHaveLength(80);
    expect(validateRoutineForm({ ...values, name: "💪".repeat(40) }).name).toBeUndefined();
    expect(validateRoutineForm({ ...values, name: "💪".repeat(41) }).name).toBe("루틴 이름은 40자까지예요.");
    expect(parseRoutineInput({ exercises: LOWER_BODY, name: "💪".repeat(40) }).ok).toBe(true);
    expect(parseRoutineInput({ exercises: LOWER_BODY, name: "💪".repeat(41) }).ok).toBe(false);
  });

  it("종목·세트는 기록과 같은 규칙으로 막는다", () => {
    const values = createRoutineFormValues({ exercises: LOWER_BODY, name: "하체" });
    const [squat] = values.exercises;
    const broken = updateSet(renameExercise(values, squat.key, " "), squat.key, squat.sets[0].key, {
      reps: "0",
      weightKg: "1.234",
    });
    const errors = validateRoutineForm(broken);
    expect(errors[`exercises.${squat.key}.name`]).toBe("종목 이름을 적어 주세요.");
    expect(errors[`exercises.${squat.key}.sets.${squat.sets[0].key}.reps`]).toBeDefined();
    expect(errors[`exercises.${squat.key}.sets.${squat.sets[0].key}.weightKg`]).toBeDefined();
  });

  it("종목은 하나 이상, 20개까지다", () => {
    const values = createRoutineFormValues({ name: "하체" });
    expect(validateRoutineForm({ ...values, exercises: [] }).exercises).toBe("종목을 하나 이상 추가해 주세요.");
    const tooMany = createRoutineFormValues({ exercises: exercisesOf(MAX_EXERCISES), name: "전신" });
    expect(validateRoutineForm(tooMany).exercises).toBeUndefined();
    tooMany.exercises.push(createEmptyExercise());
    expect(validateRoutineForm(tooMany).exercises).toBe("종목은 20개까지예요.");
  });
});

describe("Server Action 입력 확인", () => {
  const sets = (count: number) => Array.from({ length: count }, () => ({ reps: 10, weightKg: 20 }));

  it("올바른 입력은 이름을 다듬어 통과시킨다", () => {
    expect(parseRoutineInput({ exercises: LOWER_BODY, name: " 하체 " })).toEqual({
      input: { exercises: LOWER_BODY, name: "하체" },
      ok: true,
    });
  });

  it.each([
    ["이름 없음", { exercises: LOWER_BODY, name: "  " }],
    ["이름 41자", { exercises: LOWER_BODY, name: "가".repeat(41) }],
    ["종목 없음", { exercises: [], name: "하체" }],
    ["종목 21개", { exercises: exercisesOf(MAX_EXERCISES + 1), name: "전신" }],
    ["세트 31개", { exercises: [{ name: "스쿼트", sets: sets(MAX_SETS_PER_EXERCISE + 1) }], name: "하체" }],
    ["세트 없음", { exercises: [{ name: "스쿼트", sets: [] }], name: "하체" }],
    ["무게 셋째 자리", { exercises: [{ name: "스쿼트", sets: [{ reps: 1, weightKg: 1.234 }] }], name: "하체" }],
    ["횟수 소수", { exercises: [{ name: "스쿼트", sets: [{ reps: 1.5, weightKg: 1 }] }], name: "하체" }],
    ["id가 uuid 아님", { exercises: LOWER_BODY, id: "1", name: "하체" }],
    ["객체 아님", null],
  ])("%s는 거절한다", (_label, input) => {
    expect(parseRoutineInput(input).ok).toBe(false);
  });

  it("상한 경계값은 받는다", () => {
    const input = {
      exercises: Array.from({ length: MAX_EXERCISES }, () => ({
        name: "가".repeat(50),
        sets: sets(MAX_SETS_PER_EXERCISE),
      })),
      name: "가".repeat(40),
    };
    expect(parseRoutineInput(input).ok).toBe(true);
  });
});

describe("오류 문구", () => {
  it("개수 상한과 제약 위반을 구분한다", () => {
    expect(getRoutineErrorMessage({ message: "too_many_routines", code: "23514" })).toContain("30개까지");
    expect(getRoutineErrorMessage({ message: "new row violates check constraint", code: "23514" })).toBe(
      "입력한 값을 다시 확인해 주세요.",
    );
    expect(getRoutineErrorMessage({ message: "routine_not_found" })).toContain("찾지 못했어요");
  });
});
