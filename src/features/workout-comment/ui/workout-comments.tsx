import { unstable_rethrow } from "next/navigation";

import type { WorkoutComment } from "../model/comment";
import type { CommentAction } from "../model/comment-form";
import { WorkoutCommentsView } from "./workout-comments-view";

type WorkoutCommentsProps = {
  workoutId: string;
  // 조회와 작성·삭제는 페이지 진입점이 넘긴다. 이 컴포넌트는 서버 API를 직접 알지 않는다.
  loadComments: (workoutId: string) => Promise<WorkoutComment[]>;
  createAction: CommentAction;
  deleteAction: CommentAction;
};

export async function WorkoutComments({ workoutId, loadComments, createAction, deleteAction }: WorkoutCommentsProps) {
  let comments: WorkoutComment[] | null;
  try {
    comments = await loadComments(workoutId);
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
      createAction={createAction}
      deleteAction={deleteAction}
    />
  );
}
