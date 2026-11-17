import { formatDistance } from "@/entities/workout/model/pace";
import type { WorkoutKind } from "@/entities/workout/model/types";

import type { WorkoutRecipient } from "./recipients";

/**
 * 서비스 워커(public/sw.js)가 받는 알림 내용. url은 앱 안 경로만 쓴다.
 *
 * 받는 사람이 볼 수 없는 정보는 넣지 않는다.
 *   - 기록 알림: 받는 사람은 그 기록을 볼 수 있는 크루 구성원이나 동행자다. 보낸 사람 닉네임도 같은 크루라서 보인다.
 *   - 댓글 알림: 작성자는 자기 기록의 댓글을 모두 보지만, 크루를 나간 동행자가 쓴 댓글이면 닉네임을 못 볼 수 있다.
 *     그래서 닉네임 없이 댓글 내용만 보낸다.
 */
export type PushPayload = { title: string; body: string; url: string; tag: string };

export type NotifiedWorkout = {
  id: string;
  kind: WorkoutKind;
  title: string | null;
  distanceMeters: number | null;
  crewName: string | null;
};

const COMMENT_PREVIEW_LENGTH = 80;

const KIND_LABEL: Record<WorkoutKind, string> = { other: "운동", run: "러닝", strength: "헬스" };

export const getWorkoutPath = (workoutId: string) => `/workouts/${workoutId}`;

export const describeWorkout = ({ kind, title, distanceMeters }: NotifiedWorkout) => {
  const trimmedTitle = title?.trim();
  if (trimmedTitle) return trimmedTitle;
  if (kind === "run" && distanceMeters) return `러닝 ${formatDistance(distanceMeters)}`;
  return KIND_LABEL[kind];
};

export const buildWorkoutPayload = ({
  actorNickname,
  reason,
  workout,
}: {
  actorNickname: string;
  reason: WorkoutRecipient["reason"];
  workout: NotifiedWorkout;
}): PushPayload => {
  const summary = describeWorkout(workout);
  const url = getWorkoutPath(workout.id);
  const tag = `workout-${workout.id}`;

  if (reason === "companion") {
    return {
      body: `${actorNickname}님이 ${summary} 기록에 나를 함께한 친구로 남겼어요.`,
      tag,
      title: "함께한 운동",
      url,
    };
  }
  return {
    body: `${actorNickname}님이 ${summary} 기록을 공유했어요.`,
    tag,
    title: workout.crewName ? `${workout.crewName} 새 기록` : "크루 새 기록",
    url,
  };
};

export const buildCommentPayload = ({ workoutId, body }: { workoutId: string; body: string }): PushPayload => {
  const text = body.trim().replace(/\s+/g, " ");
  const preview = text.length > COMMENT_PREVIEW_LENGTH ? `${text.slice(0, COMMENT_PREVIEW_LENGTH)}…` : text;
  return { body: preview, tag: `comment-${workoutId}`, title: "내 기록에 새 댓글", url: getWorkoutPath(workoutId) };
};
