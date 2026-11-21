import { EXERCISES, type ExerciseDefinition } from "./exercises";

// 최고 무게 SQL 함수와 내 종목 유일 인덱스도 동일하게 공백을 모두 제거한다. 대소문자나 유사 종목은 합치지 않는다.
export const normalizeExerciseName = (name: string) => name.replace(/\s+/gu, "");
const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const initial = (char: string) => {
  const offset = char.charCodeAt(0) - 0xac00;
  return offset >= 0 && offset <= 0xd7a3 - 0xac00 ? INITIALS[Math.floor(offset / 588)] : char;
};

// 완성 글자는 그대로, 초성은 해당 위치의 글자 초성과 비교한다.
const matchesName = (name: string, term: string) =>
  Array.from({ length: Math.max(0, name.length - term.length + 1) }, (_, start) => start).some((start) =>
    Array.from(term).every((char, index) =>
      INITIALS.includes(char) ? initial(name[start + index]) === char : name[start + index] === char,
    ),
  );

/**
 * 추천에 뜨는 종목. 사전 종목이면 userExerciseId가 없고, 내 종목이면 그 id가 있다.
 * 내 종목은 사전 종목과 같은 모양(이름·부위·맨몸)이라 검색과 맨몸 안내를 그대로 쓴다.
 */
export type ExerciseOption = ExerciseDefinition & { userExerciseId?: string };
type UserExerciseLike = ExerciseDefinition & { id: string };

const isSameName = (left: string, right: string) => normalizeExerciseName(left) === normalizeExerciseName(right);

/**
 * 내 종목을 앞에, 사전 종목을 뒤에 둔다. 직접 등록한 종목이 찾는 종목일 가능성이 높다.
 * 사전에 나중에 같은 이름이 생기면 사전 종목 하나만 남긴다.
 */
export const listExerciseOptions = (userExercises: readonly UserExerciseLike[] = []): ExerciseOption[] => [
  ...userExercises
    .filter((exercise) => !EXERCISES.some((item) => isSameName(item.name, exercise.name)))
    .map(({ id, name, bodyPart, bodyweight }) => ({ bodyPart, bodyweight, name, userExerciseId: id })),
  ...EXERCISES,
];

export const searchExercises = (query: string, userExercises: readonly UserExerciseLike[] = []) => {
  const term = normalizeExerciseName(query).toLowerCase();
  return listExerciseOptions(userExercises).filter(({ name, bodyPart }) => {
    const normalized = normalizeExerciseName(name).toLowerCase();
    return matchesName(normalized, term) || bodyPart.startsWith(term);
  });
};

// 공백만 다른 이름은 같은 종목이다. 대소문자는 구분한다.
export const findExercise = (
  name: string,
  userExercises: readonly UserExerciseLike[] = [],
): ExerciseOption | undefined => listExerciseOptions(userExercises).find((exercise) => isSameName(exercise.name, name));
