"use client";

import { ClipboardTextIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react";

import { describeRoutine, type Routine } from "@/entities/routine/model/routine";
import {
  describeRecentStrength,
  formatRecentStrengthDate,
  RECENT_STRENGTH_DAYS,
  type RecentStrengthWorkout,
} from "@/entities/workout/model/recent-strength";
import type { StrengthExerciseFormValues } from "@/features/workout/model/workout-form";

import { ExerciseSourcePicker } from "./exercise-source-picker";

type Exercises = StrengthExerciseFormValues[];
type Load = (update: (exercises: Exercises) => Exercises) => void;

// 내 루틴을 골라 채운다.
export function RoutinePicker({
  routines,
  exercises,
  onLoad,
  onOpen,
}: {
  routines: Routine[];
  exercises: Exercises;
  onLoad: (update: (exercises: Exercises) => Exercises, routine: Routine) => void;
  onOpen?: () => void;
}) {
  return (
    <ExerciseSourcePicker
      sources={routines.map((routine) => ({ ...routine, summary: describeRoutine(routine), title: routine.name }))}
      exercises={exercises}
      onLoad={(update, source) => onLoad(update, routines.find((routine) => routine.id === source.id) ?? source)}
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

export const getRecentWorkoutTitle = (workout: Pick<RecentStrengthWorkout, "workoutDate" | "title">) =>
  [formatRecentStrengthDate(workout.workoutDate), workout.title].filter(Boolean).join(" · ");

// 최근 7일 안의 내 헬스 기록을 골라 그 종목·세트로 채운다.
export function RecentWorkoutPicker({
  workouts,
  exercises,
  onLoad,
  onOpen,
}: {
  workouts: RecentStrengthWorkout[];
  exercises: Exercises;
  onLoad: Load;
  onOpen?: () => void;
}) {
  return (
    <ExerciseSourcePicker
      sources={workouts.map((workout) => ({
        exercises: workout.exercises,
        id: workout.id,
        summary: describeRecentStrength(workout),
        title: getRecentWorkoutTitle(workout),
      }))}
      exercises={exercises}
      onLoad={(update) => onLoad(update)}
      onOpen={onOpen}
      triggerIcon={<ClockCounterClockwiseIcon />}
      triggerLabel="최근 기록 불러오기"
      noun="기록"
      listTitle="어떤 기록을 불러올까요?"
      listDescription={`최근 ${RECENT_STRENGTH_DAYS}일 동안 내가 쓴 헬스 기록이에요. 그날의 종목과 세트를 채워 드려요.`}
      emptyMessage={`최근 ${RECENT_STRENGTH_DAYS}일 동안 쓴 헬스 기록이 없어요.`}
      pickAnotherLabel="다른 기록 고르기"
    />
  );
}
