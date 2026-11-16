import type { WorkoutListFilter, WorkoutListItem, WorkoutPage } from "@/entities/workout/model/contracts";
import { getMonthRange } from "@/pages/workout/list/model/calendar";
import type { ListState } from "@/pages/workout/list/model/filters";

// 실제 목록 페이지(`pages/workout/list`)와 같은 규칙으로 읽는다. 달력은 그 달의 기록을 모두 모은다.
export const loadWorkoutList = async (
  getWorkoutPage: (filter: WorkoutListFilter) => Promise<WorkoutPage>,
  state: ListState,
): Promise<{ workouts: WorkoutListItem[]; nextCursor: string | null }> => {
  const filter: WorkoutListFilter = {
    kind: state.kind === "all" ? undefined : state.kind,
    ...(state.view === "calendar" ? getMonthRange(state.month) : { cursor: state.cursor }),
  };
  let page = await getWorkoutPage(filter);
  const workouts = [...page.items];
  while (page.nextCursor && state.view === "calendar") {
    page = await getWorkoutPage({ ...filter, cursor: page.nextCursor });
    workouts.push(...page.items);
  }
  return { workouts, nextCursor: page.nextCursor };
};
