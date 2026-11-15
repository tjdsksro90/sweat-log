/**
 * 계약 타입(contracts.ts)에 맞춘 가짜 데이터. A의 조회 함수가 들어오기 전 B·C가 화면을 만들 때,
 * 그리고 테스트에서 쓴다. 실제 화면 코드에서 이 파일을 import한 채로 PR을 올리지 않는다.
 */
import type { WeeklySummary, WorkoutDetail, WorkoutListItem } from "./contracts";

const MINSU = { id: "00000000-0000-0000-0000-00000000000a", nickname: "민수" };
const JIEUN = { id: "00000000-0000-0000-0000-00000000000b", nickname: "지은" };
const CREW = { id: "00000000-0000-0000-0000-0000000000c1", name: "새벽러닝" };

export const SAMPLE_WORKOUTS: WorkoutListItem[] = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    kind: "run",
    workoutDate: "2026-11-14",
    title: "한강 새벽 러닝",
    placeName: "반포한강공원",
    author: MINSU,
    companions: [JIEUN],
    crew: CREW,
    run: { distanceMeters: 7200, durationSeconds: 2430 },
    strengthSummary: null,
    durationSeconds: null,
    commentCount: 2,
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    kind: "strength",
    workoutDate: "2026-11-13",
    title: "하체 데이",
    placeName: "동네 헬스장",
    author: MINSU,
    companions: [],
    crew: null,
    run: null,
    strengthSummary: { exerciseCount: 2, setCount: 6, totalVolumeKg: 3720 },
    durationSeconds: 3900,
    commentCount: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    kind: "other",
    workoutDate: "2026-11-11",
    title: "북한산 등산",
    placeName: null,
    author: JIEUN,
    companions: [MINSU],
    crew: CREW,
    run: null,
    strengthSummary: null,
    durationSeconds: 10800,
    commentCount: 1,
  },
];

export const SAMPLE_STRENGTH_DETAIL: WorkoutDetail = {
  ...SAMPLE_WORKOUTS[1],
  memo: "스쿼트 무게 올림",
  exercises: [
    {
      name: "스쿼트",
      sets: [
        { weightKg: 60, reps: 10 },
        { weightKg: 70, reps: 8 },
        { weightKg: 80, reps: 6 },
      ],
    },
    {
      name: "런지",
      sets: [
        { weightKg: 20, reps: 12 },
        { weightKg: 20, reps: 12 },
        { weightKg: null, reps: 15 },
      ],
    },
  ],
  isMine: true,
  createdAt: "2026-11-13T12:30:00.000Z",
};

export const SAMPLE_WEEKLY_SUMMARY: WeeklySummary = {
  weekStart: "2026-11-09",
  workoutCount: 3,
  runDistanceMeters: 7200,
  strengthVolumeKg: 3720,
  streakDays: 2,
  activeDates: ["2026-11-11", "2026-11-13", "2026-11-14"],
};
