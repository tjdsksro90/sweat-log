"use client";

import { ClipboardTextIcon } from "@phosphor-icons/react";

import { describeRoutine, type Routine } from "@/entities/routine/model/routine";
import type { RoutineLoadMode } from "@/features/workout/model/routine-form";
import type { StrengthExerciseFormValues } from "@/features/workout/model/workout-form";

import { ExerciseSourcePicker } from "./exercise-source-picker";

type Exercises = StrengthExerciseFormValues[];

// 내 루틴을 골라 채운다.
export function RoutinePicker({
  routines,
  exercises,
  onLoad,
  onOpen,
}: {
  routines: Routine[];
  exercises: Exercises;
  onLoad: (update: (exercises: Exercises) => Exercises, routine: Routine, mode: RoutineLoadMode) => void;
  onOpen?: () => void;
}) {
  return (
    <ExerciseSourcePicker
      sources={routines.map((routine) => ({ ...routine, summary: describeRoutine(routine), title: routine.name }))}
      exercises={exercises}
      onLoad={onLoad}
      onOpen={onOpen}
      triggerIcon={<ClipboardTextIcon />}
      triggerLabel="루틴 불러오기"
      noun="루틴"
      listTitle="어떤 루틴을 불러올까요?"
      listDescription="루틴의 종목과 세트를 채워 드려요. 불러온 뒤에도 무게와 횟수를 고칠 수 있어요."
      emptyMessage="저장한 루틴이 없어요. 설정의 ‘내 루틴’에서 만들거나, 헬스 기록 상세에서 그 구성으로 만들 수 있어요."
      pickAnotherLabel="다른 루틴 고르기"
    />
  );
}
