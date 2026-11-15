/**
 * 영역 간 계약. A(DB·서버)가 이 모양으로 데이터를 돌려주고, B(기록 작성)·C(목록·통계)는 이 모양만 보고 작업한다.
 * 그래서 A가 끝나기 전에도 B와 C가 가짜 데이터로 동시에 시작할 수 있다.
 * 모양을 바꿔야 하면 바꾸는 쪽이 PR 설명에 적고, 이 파일을 쓰는 다른 영역 담당에게 알린다.
 */
import type { WorkoutKind } from "./types";

export type WorkoutPerson = {
  id: string;
  nickname: string;
};

export type RunDetail = {
  distanceMeters: number;
  durationSeconds: number;
};

export type StrengthSet = {
  weightKg: number | null;
  reps: number;
};

export type StrengthExercise = {
  name: string;
  sets: StrengthSet[];
};

// 목록·달력·피드 카드 한 장에 필요한 만큼만
export type WorkoutListItem = {
  id: string;
  kind: WorkoutKind;
  workoutDate: string; // YYYY-MM-DD
  title: string | null;
  placeName: string | null;
  author: WorkoutPerson;
  companions: WorkoutPerson[];
  crew: { id: string; name: string } | null;
  run: RunDetail | null; // kind === "run"일 때만
  strengthSummary: { exerciseCount: number; setCount: number; totalVolumeKg: number } | null; // kind === "strength"일 때만
  durationSeconds: number | null;
  commentCount: number;
};

export type WorkoutDetail = Omit<WorkoutListItem, "strengthSummary"> & {
  memo: string | null;
  exercises: StrengthExercise[]; // 헬스가 아니면 빈 배열
  isMine: boolean;
  createdAt: string;
};

// 작성·수정 폼이 서버에 보내는 값. 새 기록이면 id를 비운다.
export type WorkoutInput = {
  id?: string;
  kind: WorkoutKind;
  workoutDate: string;
  title: string | null;
  memo: string | null;
  placeName: string | null;
  crewId: string | null;
  companionIds: string[];
  durationSeconds: number | null; // 헬스·기타의 전체 운동 시간
  run: RunDetail | null;
  exercises: StrengthExercise[];
};

export type WorkoutListFilter = {
  from?: string; // YYYY-MM-DD, 포함
  to?: string; // YYYY-MM-DD, 포함
  kind?: WorkoutKind;
  crewId?: string; // 크루 피드
  cursor?: string; // 다음 페이지
};

export type WorkoutPage = {
  items: WorkoutListItem[];
  nextCursor: string | null;
};

export type WeeklySummary = {
  weekStart: string; // 월요일, YYYY-MM-DD
  workoutCount: number;
  runDistanceMeters: number;
  strengthVolumeKg: number;
  streakDays: number; // 오늘(또는 어제)까지 하루도 안 빠지고 운동한 날 수
  activeDates: string[]; // 이번 주에 운동한 날
};
