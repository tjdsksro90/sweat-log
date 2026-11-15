import { unstable_rethrow } from "next/navigation";

import { createComment, deleteComment } from "../api/comment-actions";
import { getWorkoutComments } from "../api/queries";
import type { WorkoutComment } from "../model/comment";
import { WorkoutCommentsView } from "./workout-comments-view";

export async function WorkoutComments({ workoutId }: { workoutId: string }) {
  let comments: WorkoutComment[] | null;
  try {
    comments = await getWorkoutComments(workoutId);
  } catch (error) {
    // 로그인 이동 같은 Next.js 내부 흐름은 그대로 넘기고, 조회 실패만 화면에서 안내한다.
    unstable_rethrow(error);
    comments = null;
  }
  return (
    <WorkoutCommentsView
      workoutId={workoutId}
      comments={comments}
      now={new Date()}
      createAction={createComment}
      deleteAction={deleteComment}
    />
  );
}
