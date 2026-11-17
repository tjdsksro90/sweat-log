/**
 * 알림을 받을 사람을 고른다. 입력은 모두 서버가 DB에서 다시 읽은 값이고, 클라이언트가 보낸 값은 쓰지 않는다.
 * 자기 행동으로는 자기에게 알림이 가지 않는다.
 */

// 기록 하나를 볼 수 있는 사람을 정하는 값. 수정 전후를 비교해 새로 들어온 사람만 알린다.
export type WorkoutAudience = { crewId: string | null; companionIds: string[] };

export type WorkoutRecipient = { userId: string; reason: "companion" | "crew" };

export const selectWorkoutRecipients = ({
  actorId,
  before,
  after,
  crewMemberIds,
}: {
  actorId: string;
  // 새 기록이면 null
  before: WorkoutAudience | null;
  after: WorkoutAudience;
  // after.crewId 크루의 구성원. 크루가 없으면 빈 배열
  crewMemberIds: string[];
}): WorkoutRecipient[] => {
  const alreadyKnew = new Set([actorId, ...(before?.companionIds ?? [])]);
  const recipients = new Map<string, WorkoutRecipient["reason"]>();

  // 동행자로 새로 추가된 사람. 크루 구성원이기도 하면 동행자 알림 하나만 받는다.
  for (const userId of after.companionIds) {
    if (!alreadyKnew.has(userId)) recipients.set(userId, "companion");
  }

  // 크루에 새로 공유됐을 때만 그 크루에 알린다. 같은 크루에서 메모만 고친 수정은 알리지 않는다.
  const sharedNow = after.crewId !== null && after.crewId !== (before?.crewId ?? null);
  if (sharedNow) {
    for (const userId of crewMemberIds) {
      if (!alreadyKnew.has(userId) && !recipients.has(userId)) recipients.set(userId, "crew");
    }
  }

  return [...recipients].map(([userId, reason]) => ({ reason, userId }));
};

/**
 * 댓글은 기록 작성자에게만 알린다. 동행자는 알리지 않는다.
 * 동행자는 남의 기록에 이름만 올라간 사람이라 그 기록의 댓글마다 알림을 받으면 소음이 크고,
 * 끌 방법이 알림 전체 끄기뿐이다. 동행자가 직접 댓글을 단 대화에 답이 달리는 경우는 이후 과제로 남긴다.
 */
export const selectCommentRecipients = ({ actorId, authorId }: { actorId: string; authorId: string }) =>
  actorId === authorId ? [] : [authorId];
