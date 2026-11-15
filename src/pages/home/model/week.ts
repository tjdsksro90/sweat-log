import type { WeeklySummary } from "@/entities/workout/model/contracts";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export const buildWeekDays = (summary: Pick<WeeklySummary, "weekStart" | "activeDates">) => {
  const start = new Date(`${summary.weekStart}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(summary.weekStart) ||
    Number.isNaN(start.getTime()) ||
    start.toISOString().slice(0, 10) !== summary.weekStart ||
    start.getUTCDay() !== 1
  ) {
    throw new RangeError("weekStart는 YYYY-MM-DD 형식의 유효한 월요일이어야 합니다.");
  }
  const activeDates = new Set(summary.activeDates);
  return WEEKDAY_LABELS.map((label, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    const date = day.toISOString().slice(0, 10);
    return { date, label, active: activeDates.has(date) };
  });
};
