import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { getFixtureWorkoutPage } from "./api/fixture-page";
import { getMonthRange } from "./model/calendar";
import { parseListState, type SearchParams } from "./model/filters";
import { WorkoutListView } from "./ui/workout-list-view";

export async function WorkoutListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const currentMonth = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).slice(0, 7);
  const state = parseListState(await searchParams, currentMonth);
  const filter = {
    kind: state.kind === "all" ? undefined : state.kind,
    ...(state.view === "calendar" ? getMonthRange(state.month) : {}),
  };
  let page = await getFixtureWorkoutPage(filter);
  const items = [...page.items];
  let loadedPages = 1;
  while (page.nextCursor && (state.view === "calendar" || loadedPages < state.pages)) {
    page = await getFixtureWorkoutPage({ ...filter, cursor: page.nextCursor });
    items.push(...page.items);
    loadedPages += 1;
  }
  return (
    <PageLayout title="기록">
      <WorkoutListView
        key={`${state.view}-${state.kind}-${state.month}`}
        state={state}
        workouts={items}
        hasMore={page.nextCursor !== null}
      />
    </PageLayout>
  );
}
