import Link from "next/link";

import { getWorkoutPage } from "@/entities/workout/api/server-queries";
import { getKstToday } from "@/entities/workout/model/weekly-summary";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { getMonthRange } from "./model/calendar";
import { getNewWorkoutHref, parseListState, type SearchParams } from "./model/filters";
import { WorkoutListView } from "./ui/workout-list-view";

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
  return (
    <PageLayout
      title="기록"
      action={
        <Button render={<Link href={getNewWorkoutHref(state.kind)} />} nativeButton={false} role="link">
          기록하기
        </Button>
      }
    >
      <WorkoutListView
        key={`${state.view}-${state.kind}-${state.month}-${state.cursor ?? ""}`}
        state={state}
        workouts={items}
        nextCursor={page.nextCursor}
      />
    </PageLayout>
  );
}
