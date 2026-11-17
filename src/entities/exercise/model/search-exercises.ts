import { EXERCISES } from "./exercises";

// 최고 무게 SQL 함수도 동일하게 공백을 모두 제거한다. 대소문자나 유사 종목은 합치지 않는다.
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

export const searchExercises = (query: string) => {
  const term = normalizeExerciseName(query).toLowerCase();
  return EXERCISES.filter(({ name, bodyPart }) => {
    const normalized = normalizeExerciseName(name).toLowerCase();
    return matchesName(normalized, term) || bodyPart.startsWith(term);
  });
};

export const findExercise = (name: string) =>
  EXERCISES.find((exercise) => normalizeExerciseName(exercise.name) === normalizeExerciseName(name));
