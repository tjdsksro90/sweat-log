import { EXERCISES } from "./exercises";

// 최고 무게 SQL 함수도 동일하게 공백을 모두 제거한다. 대소문자나 유사 종목은 합치지 않는다.
export const normalizeExerciseName = (name: string) => name.replace(/\s+/gu, "");
const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const initials = (name: string) =>
  Array.from(name, (char) => {
    const offset = char.charCodeAt(0) - 0xac00;
    return offset >= 0 && offset <= 0xd7a3 - 0xac00 ? INITIALS[Math.floor(offset / 588)] : char;
  }).join("");

export const searchExercises = (query: string) => {
  const term = normalizeExerciseName(query).toLowerCase();
  return EXERCISES.filter(({ name, bodyPart }) => {
    const normalized = normalizeExerciseName(name).toLowerCase();
    return normalized.includes(term) || initials(normalized).includes(term) || bodyPart.includes(term);
  });
};

export const findExercise = (name: string) =>
  EXERCISES.find((exercise) => normalizeExerciseName(exercise.name) === normalizeExerciseName(name));
