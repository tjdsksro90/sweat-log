import type { WorkoutListFilter, WorkoutPage } from "@/entities/workout/model/contracts";
import { SAMPLE_WORKOUTS } from "@/entities/workout/model/fixtures";

// A의 조회 API 병합 전 화면 연결용. 작은 페이지로 더 보기 흐름도 확인한다.
export const getFixtureWorkoutPage = async (filter: WorkoutListFilter): Promise<WorkoutPage> => {
  const items = SAMPLE_WORKOUTS.filter(
    (item) =>
      (!filter.kind || item.kind === filter.kind) &&
      (!filter.from || item.workoutDate >= filter.from) &&
      (!filter.to || item.workoutDate <= filter.to),
  ).toSorted((a, b) => b.workoutDate.localeCompare(a.workoutDate));
  const start = Number(filter.cursor ?? 0);
  return { items: items.slice(start, start + 2), nextCursor: start + 2 < items.length ? String(start + 2) : null };
};
