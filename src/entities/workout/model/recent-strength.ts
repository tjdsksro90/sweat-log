/**
 * 헬스 기록 작성 폼의 "최근 기록 불러오기". 최근 7일(한국 날짜, 오늘 포함) 안의 내가 쓴 헬스 기록이다.
 * 동행자로 들어간 친구의 기록은 친구의 무게라 내 다음 운동을 채우는 데 쓰지 않는다.
 */
import type { StrengthExercise } from "./contracts";
import { addDays } from "./weekly-summary";

export const RECENT_STRENGTH_DAYS = 7;
// 7일 안에 하루 여러 번 적어도 목록이 너무 길어지지 않게 자른다.
export const RECENT_STRENGTH_LIMIT = 20;

export type RecentStrengthWorkout = {
  id: string;
  workoutDate: string; // YYYY-MM-DD
  title: string | null;
  exercises: StrengthExercise[];
};

// 오늘 포함 7일: 오늘이 11-21이면 11-15 ~ 11-21.
export const getRecentStrengthRange = (today: string) => ({
  from: addDays(today, -(RECENT_STRENGTH_DAYS - 1)),
  to: today,
});

// 목록에 쓰는 날짜. 예: "11월 20일 (금)"
export const formatRecentStrengthDate = (workoutDate: string) => {
  const [year, month, day] = workoutDate.split("-").map(Number);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${month}월 ${day}일 (${weekday})`;
};

// 예: "종목 2개 · 세트 5개 · 스쿼트, 런지"
export const describeRecentStrength = (workout: Pick<RecentStrengthWorkout, "exercises">) => {
  const sets = workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const names = workout.exercises.map((exercise) => exercise.name).join(", ");
  return [`종목 ${workout.exercises.length}개`, `세트 ${sets}개`, names].filter(Boolean).join(" · ");
};
