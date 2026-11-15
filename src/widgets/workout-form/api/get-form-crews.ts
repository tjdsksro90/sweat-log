import "server-only";

import { getCrew, getMyCrews } from "@/entities/crew/api/queries";
import type { CrewDetail } from "@/entities/crew/model/crew";

import { toWorkoutFormCrews } from "../model/crews";

// 3단계의 크루·친구 선택지. 크루는 몇 개 안 되니 구성원은 크루마다 따로 읽는다.
export const getWorkoutFormCrews = async (currentUserId: string) => {
  const summaries = await getMyCrews();
  const details = await Promise.all(summaries.map((crew) => getCrew(crew.id)));
  return toWorkoutFormCrews(
    details.filter((crew): crew is CrewDetail => crew !== null),
    currentUserId,
  );
};
