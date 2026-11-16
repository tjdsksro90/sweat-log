import type { CrewDetail } from "@/entities/crew/model/crew";

import type { WorkoutFormCrew, WorkoutFormMember } from "./types";

// 함께한 친구 후보에서 나는 뺀다. 닉네임이 없는 구성원은 탈퇴 직후처럼 프로필을 못 읽은 경우라 이름을 대신 붙인다.
export const toWorkoutFormCrews = (crews: CrewDetail[], currentUserId: string): WorkoutFormCrew[] =>
  crews.map((crew) => ({
    id: crew.id,
    members: crew.members
      .filter((member) => member.userId !== currentUserId)
      .map((member) => ({ nickname: member.nickname ?? "이름 없는 친구", userId: member.userId })),
    name: crew.name,
  }));

/**
 * 함께한 친구 후보: 고른 크루의 구성원 + 수정 중인 기록에 이미 있던 동행자.
 * 이미 있던 동행자는 크루를 나갔거나 다른 크루 친구여도 그대로 두거나 뺄 수 있다. 새로 넣는 사람만 같은 크루여야 한다.
 */
export const withExistingCompanions = (members: WorkoutFormMember[], existing: WorkoutFormMember[]) => [
  ...members,
  ...existing.filter((companion) => !members.some((member) => member.userId === companion.userId)),
];
