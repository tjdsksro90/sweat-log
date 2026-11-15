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

// 오늘 운동했으면 오늘부터, 아직이면 어제부터 거꾸로 하루도 안 빠진 날 수. 오늘 아직 안 했다고 연속 기록이 끊기지 않는다.
export const countStreakDays = (workoutDates: string[], today: string) => {
  const dates = new Set(workoutDates);
  let day = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (dates.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }

  return streak;
};

export const buildWeeklySummary = ({
  recentDates,
  today,
  weekWorkouts,
}: {
  today: string;
  weekWorkouts: WeeklyWorkoutRow[]; // 이번 주(월~일) 기록
  recentDates: string[]; // 연속 일수 계산용 최근 운동 날짜
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
    streakDays: countStreakDays(recentDates, today),
    activeDates: [...new Set(weekWorkouts.map((workout) => workout.workout_date))].sort(),
  };
};
