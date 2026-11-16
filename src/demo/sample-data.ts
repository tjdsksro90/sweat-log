import type { CrewDetail } from "@/entities/crew/model/crew";
import type { WorkoutPerson } from "@/entities/workout/model/contracts";
import { addDays, getKstToday } from "@/entities/workout/model/weekly-summary";
import type { WorkoutDetailRow } from "@/entities/workout/model/workout-mappers";
import type { WorkoutComment } from "@/features/workout-comment/model/comment";

export const DEMO_USER: WorkoutPerson = { id: "10000000-0000-4000-8000-000000000001", nickname: "땀이" };

export const DEMO_CREW: CrewDetail = {
  id: "20000000-0000-4000-8000-000000000001",
  name: "같이 땀 흘려요",
  inviteCode: "DEMO2026",
  ownerId: DEMO_USER.id,
  members: [
    { userId: DEMO_USER.id, nickname: DEMO_USER.nickname, isOwner: true },
    { userId: "10000000-0000-4000-8000-000000000002", nickname: "지수", isOwner: false },
    { userId: "10000000-0000-4000-8000-000000000003", nickname: "민호", isOwner: false },
    { userId: "10000000-0000-4000-8000-000000000004", nickname: "소연", isOwner: false },
  ],
};

export type DemoState = {
  version: 1;
  workouts: WorkoutDetailRow[];
  comments: Record<string, WorkoutComment[]>;
};

// UUID 모양을 유지해야 실제 커서와 폼 검증을 그대로 쓸 수 있다.
const sampleId = (prefix: string, index: number) => `${prefix}-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;

export const createSampleData = (now: Date = new Date()): DemoState => {
  const today = getKstToday(now);
  const workouts: WorkoutDetailRow[] = [];
  const comments: DemoState["comments"] = {};

  for (let day = 0; day < 28; day++) {
    // 최근 5일은 연속 기록, 이전 주에는 휴식일도 둔다.
    if (day >= 5 && day % 4 === 1) continue;
    const kind = (["run", "strength", "other"] as const)[day % 3];
    const workoutDate = addDays(today, -day);
    const id = sampleId("30000000", day);
    workouts.push({
      id,
      kind,
      workout_date: workoutDate,
      title: kind === "run" ? "가볍게 동네 한 바퀴" : kind === "strength" ? "오늘도 한 세트 더" : "저녁 스트레칭",
      place_name: kind === "run" ? "한강공원" : kind === "strength" ? "동네 헬스장" : "집",
      memo: "운동을 마치니 기분이 좋아요. 내일도 조금씩!",
      duration_seconds: kind === "run" ? null : kind === "strength" ? 3600 : 1200,
      created_at: `${workoutDate}T00:00:00.000Z`,
      user_id: DEMO_USER.id,
      author: { ...DEMO_USER },
      crew: { id: DEMO_CREW.id, name: DEMO_CREW.name },
      companions: day % 2 === 0 ? [{ profile: { id: DEMO_CREW.members[1].userId, nickname: "지수" } }] : [],
      run:
        kind === "run" ? { distance_meters: 5000 + (day % 4) * 500, duration_seconds: 1800 + (day % 4) * 180 } : null,
      sets:
        kind === "strength"
          ? [
              { exercise_name: "스쿼트", exercise_order: 0, set_order: 0, weight_kg: 40, reps: 10 },
              { exercise_name: "스쿼트", exercise_order: 0, set_order: 1, weight_kg: 40, reps: 10 },
              { exercise_name: "푸시업", exercise_order: 1, set_order: 0, weight_kg: null, reps: 15 },
            ]
          : [],
      comments: [],
    });
    if (day < 3) {
      comments[id] = [
        {
          id: sampleId("40000000", day),
          userId: DEMO_CREW.members[day + 1].userId,
          nickname: DEMO_CREW.members[day + 1].nickname,
          body: ["오늘도 수고했어!", "꾸준히 하는 모습 멋지다!", "다음엔 같이 하자!"][day],
          createdAt: `${workoutDate}T01:00:00.000Z`,
          isMine: false,
        },
      ];
    }
  }

  // 동행 기록과 크루 전용 기록도 있어 두 피드의 차이를 체험할 수 있다.
  for (let index = 0; index < 3; index++) {
    const member = DEMO_CREW.members[index + 1];
    const source = workouts[index];
    workouts.push({
      ...structuredClone(source),
      id: sampleId("50000000", index),
      user_id: member.userId,
      author: { id: member.userId, nickname: member.nickname ?? "친구" },
      companions: index === 0 ? [{ profile: { ...DEMO_USER } }] : [],
    });
  }
  return { version: 1, workouts, comments };
};
