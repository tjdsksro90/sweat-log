import { Suspense } from "react";

import { notFound } from "next/navigation";

import { getWorkoutDetail } from "@/entities/workout/api/server-queries";
import { createComment, deleteComment } from "@/features/workout-comment/api/comment-actions";
import { getWorkoutComments } from "@/features/workout-comment/api/queries";
import { WorkoutComments } from "@/features/workout-comment/ui/workout-comments";
import { WorkoutCommentsLoading } from "@/features/workout-comment/ui/workout-comments-loading";

import { WorkoutDetailScreen } from "./ui/workout-detail-screen";

export async function WorkoutDetailPage({ params }: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = await params;
  const workout = await getWorkoutDetail(workoutId);
  if (!workout) notFound();
  return (
    <WorkoutDetailScreen
      workout={workout}
      comments={
        <Suspense fallback={<WorkoutCommentsLoading />}>
          <WorkoutComments
            workoutId={workout.id}
            loadComments={getWorkoutComments}
            createAction={createComment}
            deleteAction={deleteComment}
          />
        </Suspense>
      }
    />
  );
}
