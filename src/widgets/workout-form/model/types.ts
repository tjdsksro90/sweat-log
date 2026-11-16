import type { WorkoutInput } from "@/entities/workout/model/contracts";
import type { DeleteWorkoutResult, SaveWorkoutResult } from "@/features/workout/api/workout-actions";

// 3단계에서 고르는 공유 크루와, 함께한 친구 후보(나를 뺀 구성원)
export type WorkoutFormCrew = {
  id: string;
  name: string;
  members: WorkoutFormMember[];
};

export type WorkoutFormMember = { userId: string; nickname: string };

// Server Action을 prop으로 받는다. 테스트에서는 vi.fn()으로 바꿔 넣는다.
export type SaveWorkoutAction = (input: WorkoutInput) => Promise<SaveWorkoutResult>;
export type DeleteWorkoutAction = (id: string) => Promise<DeleteWorkoutResult>;
