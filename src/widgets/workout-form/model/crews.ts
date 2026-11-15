import type { CrewDetail } from "@/entities/crew/model/crew";

import type { WorkoutFormCrew } from "./types";

// 함께한 친구 후보에서 나는 뺀다. 닉네임이 없는 구성원은 탈퇴 직후처럼 프로필을 못 읽은 경우라 이름을 대신 붙인다.
export const toWorkoutFormCrews = (crews: CrewDetail[], currentUserId: string): WorkoutFormCrew[] =>
  crews.map((crew) => ({
    id: crew.id,
    members: crew.members
      .filter((member) => member.userId !== currentUserId)
      .map((member) => ({ nickname: member.nickname ?? "이름 없는 친구", userId: member.userId })),
    name: crew.name,
  }));
