import type { ReactNode } from "react";

import type { WorkoutDetail } from "@/entities/workout/model/contracts";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { WorkoutDetailView } from "./workout-detail-view";

// 댓글 영역은 자리만 받는다. 실제 앱은 서버에서 읽는 WorkoutComments를, 체험 데모는 WorkoutCommentsView를 넣는다.
export function WorkoutDetailScreen({ workout, comments }: { workout: WorkoutDetail; comments?: ReactNode }) {
  return (
    <PageLayout title="운동 기록">
      <WorkoutDetailView workout={workout} comments={comments} />
    </PageLayout>
  );
}
