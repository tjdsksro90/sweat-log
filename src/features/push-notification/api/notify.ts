import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";

import { isWorkoutKind } from "@/entities/workout/model/types";
import type { Database } from "@/shared/api/supabase/database.types";

import { buildCommentPayload, buildWorkoutPayload } from "../model/payload";
import { selectCommentRecipients, selectWorkoutRecipients, type WorkoutAudience } from "../model/recipients";
import { logPushError, sendPushMessages } from "./send-push";

/**
 * 받는 사람과 알림 내용은 보낸 사람의 세션(RLS)으로 DB에서 다시 읽어 정한다.
 * 그래서 보낸 사람이 볼 수 없는 사람·내용은 처음부터 계산에 들어오지 않고, 클라이언트는 둘 다 지정할 수 없다.
 * 발송은 after()로 응답을 보낸 뒤에 하므로 저장·댓글 응답을 막지 않고, 실패해도 저장 결과는 바뀌지 않는다.
 */

type ActorClient = SupabaseClient<Database>;

const runAfterResponse = (label: string, task: () => Promise<void>) => {
  after(async () => {
    try {
      await task();
    } catch (error) {
      logPushError(`${label} 알림을 처리하지 못했습니다.`, error);
    }
  });
};

const loadWorkout = async (supabase: ActorClient, workoutId: string) => {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, user_id, crew_id, kind, title, run_details(distance_meters), workout_companions(user_id), crews(name)")
    .eq("id", workoutId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

/**
 * 수정 전 공개 범위. 수정 저장 전에 불러 둔다. 못 읽으면 undefined를 돌려주고, 그 수정은 알리지 않는다.
 * (모르는 상태에서 보내면 이미 알던 사람에게 같은 알림이 또 간다.)
 */
export const captureWorkoutAudience = async (
  supabase: ActorClient,
  workoutId: string,
): Promise<WorkoutAudience | undefined> => {
  try {
    const workout = await loadWorkout(supabase, workoutId);
    if (!workout) return undefined;
    return { companionIds: workout.workout_companions.map((c) => c.user_id), crewId: workout.crew_id };
  } catch {
    return undefined;
  }
};

export const notifyWorkoutSaved = ({
  supabase,
  actorId,
  workoutId,
  before,
}: {
  supabase: ActorClient;
  actorId: string;
  workoutId: string;
  // 새 기록이면 null. 수정인데 수정 전 상태를 못 읽었으면 undefined로 넘겨 알리지 않는다.
  before: WorkoutAudience | null | undefined;
}) => {
  if (before === undefined) return;

  runAfterResponse("기록", async () => {
    const workout = await loadWorkout(supabase, workoutId);
    if (!workout || workout.user_id !== actorId || !isWorkoutKind(workout.kind)) return;

    const crewMembers = workout.crew_id
      ? await supabase.from("crew_members").select("user_id").eq("crew_id", workout.crew_id)
      : { data: [], error: null };
    if (crewMembers.error) throw new Error(crewMembers.error.message);

    const recipients = selectWorkoutRecipients({
      actorId,
      after: { companionIds: workout.workout_companions.map((c) => c.user_id), crewId: workout.crew_id },
      before,
      crewMemberIds: crewMembers.data.map((member) => member.user_id),
    });
    if (recipients.length === 0) return;

    const { data: actor, error } = await supabase.from("profiles").select("nickname").eq("id", actorId).single();
    if (error) throw new Error(error.message);

    const notified = {
      crewName: workout.crews?.name ?? null,
      distanceMeters: workout.run_details?.distance_meters ?? null,
      id: workout.id,
      kind: workout.kind,
      title: workout.title,
    };
    await sendPushMessages(
      recipients.map(({ reason, userId }) => ({
        payload: buildWorkoutPayload({ actorNickname: actor.nickname, reason, workout: notified }),
        userId,
      })),
    );
  });
};

export const notifyCommentCreated = ({
  supabase,
  actorId,
  workoutId,
  body,
}: {
  supabase: ActorClient;
  actorId: string;
  workoutId: string;
  // 방금 저장한 댓글 본문
  body: string;
}) => {
  runAfterResponse("댓글", async () => {
    const { data: workout, error } = await supabase
      .from("workouts")
      .select("user_id")
      .eq("id", workoutId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!workout) return;

    const recipients = selectCommentRecipients({ actorId, authorId: workout.user_id });
    await sendPushMessages(recipients.map((userId) => ({ payload: buildCommentPayload({ body, workoutId }), userId })));
  });
};
