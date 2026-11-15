import { notFound } from "next/navigation";

import type { WorkoutDetail } from "@/entities/workout/model/contracts";
import { SAMPLE_STRENGTH_DETAIL, SAMPLE_WORKOUTS } from "@/entities/workout/model/fixtures";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { WorkoutDetailView } from "./ui/workout-detail-view";

export async function WorkoutDetailPage({ params }: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = await params;
  const item = SAMPLE_WORKOUTS.find((workout) => workout.id === workoutId);
  if (!item) notFound();
  const workout: WorkoutDetail =
    item.id === SAMPLE_STRENGTH_DETAIL.id
      ? SAMPLE_STRENGTH_DETAIL
      : {
          ...item,
          memo: null,
          exercises: [],
          isMine: false,
          createdAt: `${item.workoutDate}T00:00:00.000Z`,
        };
  return (
    <PageLayout title="운동 기록">
      <WorkoutDetailView workout={workout} />
    </PageLayout>
  );
}
