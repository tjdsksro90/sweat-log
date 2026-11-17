import { notFound } from "next/navigation";

import { countMyRoutines, getRoutine } from "@/entities/routine/api/server-queries";
import { ROUTINE_LIMITS } from "@/entities/routine/model/routine";
import { getStrengthWorkoutTemplate } from "@/entities/workout/api/server-queries";
import { deleteRoutine, saveRoutine } from "@/features/workout/api/routine-actions";
import { createRoutineFormValues } from "@/features/workout/model/routine-form";
import { isUuid } from "@/features/workout/model/save-workout-input";
import { RoutineForm } from "@/widgets/workout-form";

import { RoutineLimitScreen } from "./ui/routine-limit-screen";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * 새 루틴. 헬스 기록 상세의 "이 구성으로 루틴 만들기"는 ?from=<기록 id>로 온다.
 * 볼 수 있는 헬스 기록이면 그 종목·세트와 제목으로 채우고, 아니면 빈 루틴으로 시작한다.
 */
export async function NewRoutinePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { from } = await searchParams;
  const [count, workout] = await Promise.all([
    countMyRoutines(),
    isUuid(from) ? getStrengthWorkoutTemplate(from) : null,
  ]);
  if (count >= ROUTINE_LIMITS.perUser) return <RoutineLimitScreen />;

  const source = workout ? { exercises: workout.exercises, name: workout.title ?? "" } : {};

  return <RoutineForm title="새 루틴" initialValues={createRoutineFormValues(source)} saveRoutine={saveRoutine} />;
}

export async function EditRoutinePage({ routineId }: { routineId: string }) {
  const routine = await getRoutine(routineId);
  if (!routine) notFound();

  return (
    <RoutineForm
      title="루틴 고치기"
      initialValues={createRoutineFormValues(routine)}
      saveRoutine={saveRoutine}
      deleteRoutine={deleteRoutine}
    />
  );
}
