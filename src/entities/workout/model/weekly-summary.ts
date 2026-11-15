/**
 * 홈 이번 주 요약 계산. 날짜는 모두 한국 시간 기준 YYYY-MM-DD 문자열로 다룬다.
 * 문자열 날짜를 UTC 자정으로 읽어 계산하므로 서버 시간대와 상관없이 결과가 같다.
 */
import type { WeeklySummary } from "./contracts";
import { getSetVolumeKg } from "./workout-mappers";

export type WeeklyWorkoutRow = {
  kind: string;
  workout_date: string;
  run: { distance_meters: number } | null;
  sets: { weight_kg: number | null; reps: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toUtcDate = (date: string) => new Date(`${date}T00:00:00Z`);

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (date: string, days: number) =>
  toDateString(new Date(toUtcDate(date).getTime() + days * DAY_MS));

export const getKstToday = (now: Date = new Date()) =>
  // en-CA는 YYYY-MM-DD로 쓴다.
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(now);

// 월요일 시작 주
export const getWeekStart = (date: string) => {
  const dayOfWeek = toUtcDate(date).getUTCDay(); // 0 = 일요일
  return addDays(date, -((dayOfWeek + 6) % 7));
};

export const buildWeeklySummary = ({
  streakDays,
  today,
  weekWorkouts,
}: {
  today: string;
  weekWorkouts: WeeklyWorkoutRow[]; // 이번 주(월~일) 기록
  streakDays: number; // get_workout_streak RPC가 센 연속 운동 일수
}): WeeklySummary => {
  const runDistanceMeters = weekWorkouts.reduce(
    (total, workout) => total + (workout.kind === "run" ? (workout.run?.distance_meters ?? 0) : 0),
    0,
  );
  const strengthVolumeKg = weekWorkouts.reduce(
    (total, workout) =>
      total + (workout.kind === "strength" ? workout.sets.reduce((sum, set) => sum + getSetVolumeKg(set), 0) : 0),
    0,
  );

  return {
    weekStart: getWeekStart(today),
    workoutCount: weekWorkouts.length,
    runDistanceMeters,
    strengthVolumeKg: Math.round(strengthVolumeKg * 100) / 100,
    streakDays,
    activeDates: [...new Set(weekWorkouts.map((workout) => workout.workout_date))].sort(),
  };
};
