import type { WorkoutListItem } from "@/entities/workout/model/contracts";
import { WORKOUT_KINDS, type WorkoutKind } from "@/entities/workout/model/types";

export type CalendarDay = {
  date: string;
  day: number;
  kinds: WorkoutKind[];
};

const parseMonth = (month: string) => {
  if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new RangeError("월은 YYYY-MM 형식이어야 합니다.");
  }
  const [year, monthNumber] = month.split("-").map(Number);
  return { year, monthNumber };
};

export const getMonthRange = (month: string) => {
  const { year, monthNumber } = parseMonth(month);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${lastDay}` };
};

// 월요일부터 시작하며, 월 바깥 칸은 null로 채워 완전한 주 단위로 반환한다.
export const buildMonthCalendar = (month: string, workouts: readonly WorkoutListItem[]): (CalendarDay | null)[] => {
  const { year, monthNumber } = parseMonth(month);
  const firstWeekday = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const kindsByDate = new Map<string, Set<WorkoutKind>>();
  for (const workout of workouts) {
    const kinds = kindsByDate.get(workout.workoutDate) ?? new Set<WorkoutKind>();
    kinds.add(workout.kind);
    kindsByDate.set(workout.workoutDate, kinds);
  }

  return Array.from({ length: Math.ceil((firstWeekday + lastDay) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    if (day < 1 || day > lastDay) return null;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    return { date, day, kinds: WORKOUT_KINDS.filter((kind) => kindsByDate.get(date)?.has(kind)) };
  });
};
