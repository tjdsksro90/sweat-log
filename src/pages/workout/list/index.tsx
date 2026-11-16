import { getWorkoutPage } from "@/entities/workout/api/server-queries";
import { getKstToday } from "@/entities/workout/model/weekly-summary";

import { getMonthRange } from "./model/calendar";
import { parseListState, type SearchParams } from "./model/filters";
import { WorkoutListScreen } from "./ui/workout-list-screen";

export async function WorkoutListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const currentMonth = getKstToday().slice(0, 7);
  const state = parseListState(await searchParams, currentMonth);
  const filter = {
    kind: state.kind === "all" ? undefined : state.kind,
    ...(state.view === "calendar" ? getMonthRange(state.month) : { cursor: state.cursor }),
  };
  let page = await getWorkoutPage(filter);
  const items = [...page.items];
  while (page.nextCursor && state.view === "calendar") {
    page = await getWorkoutPage({ ...filter, cursor: page.nextCursor });
    items.push(...page.items);
  }
  return <WorkoutListScreen state={state} workouts={items} nextCursor={page.nextCursor} />;
}
