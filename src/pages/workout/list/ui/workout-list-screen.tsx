import type { WorkoutListItem } from "@/entities/workout/model/contracts";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { getNewWorkoutHref, type ListState } from "../model/filters";
import { WorkoutListView } from "./workout-list-view";

export function WorkoutListScreen({
  state,
  workouts,
  nextCursor,
}: {
  state: ListState;
  workouts: WorkoutListItem[];
  nextCursor: string | null;
}) {
  return (
    <PageLayout
      title="기록"
      action={
        <Button render={<AppLink href={getNewWorkoutHref(state.kind)} />} nativeButton={false} role="link">
          기록하기
        </Button>
      }
    >
      <WorkoutListView
        key={`${state.view}-${state.kind}-${state.month}-${state.cursor ?? ""}`}
        state={state}
        workouts={workouts}
        nextCursor={nextCursor}
      />
    </PageLayout>
  );
}
