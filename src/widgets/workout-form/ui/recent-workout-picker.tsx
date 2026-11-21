"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";

import {
  describeRecentStrength,
  formatRecentStrengthDate,
  RECENT_STRENGTH_DAYS,
  type RecentStrengthWorkout,
} from "@/entities/workout/model/recent-strength";
import type { RoutineLoadMode } from "@/features/workout/model/routine-form";
import type { StrengthExerciseFormValues } from "@/features/workout/model/workout-form";

import { ExerciseSourcePicker } from "./exercise-source-picker";

type Exercises = StrengthExerciseFormValues[];

// 목록 제목. 예: "11월 20일 (금) · 하체" / 제목이 없으면 날짜만.
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
  onLoad: (update: (exercises: Exercises) => Exercises, mode: RoutineLoadMode) => void;
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
      onLoad={(update, _source, mode) => onLoad(update, mode)}
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
