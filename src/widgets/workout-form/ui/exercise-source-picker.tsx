"use client";

import { type ReactNode, useState } from "react";

import type { RoutineExercise } from "@/entities/routine/model/routine";
import {
  canAppendRoutine,
  hasEnteredExercises,
  loadRoutineExercises,
  type RoutineLoadMode,
} from "@/features/workout/model/routine-form";
import { MAX_EXERCISES, type StrengthExerciseFormValues } from "@/features/workout/model/workout-form";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/shared/ui/bottom-sheet";
import { Button } from "@/shared/ui/button";

type Exercises = StrengthExerciseFormValues[];

export type ExerciseSource = {
  id: string;
  title: string; // 목록 제목, 덮어쓰기 확인 문구에도 쓴다
  summary: string;
  exercises: RoutineExercise[];
};

/**
 * 헬스 상세에서 저장해 둔 구성(루틴, 최근 기록)을 골라 종목·세트를 채운다. 값을 복사하므로 불러온 뒤 평소처럼 고칠 수 있다.
 * 이미 적은 종목이 있으면 덮어쓸지 뒤에 붙일지 한 번 더 묻는다.
 */
export function ExerciseSourcePicker<Source extends ExerciseSource>({
  sources,
  exercises,
  onLoad,
  onOpen,
  triggerIcon,
  triggerLabel,
  noun,
  listTitle,
  listDescription,
  emptyMessage,
  pickAnotherLabel,
}: {
  sources: Source[];
  exercises: Exercises;
  onLoad: (update: (exercises: Exercises) => Exercises, source: Source) => void;
  onOpen?: () => void;
  triggerIcon: ReactNode;
  triggerLabel: string;
  noun: string; // "루틴", "기록"
  listTitle: string;
  listDescription: string;
  emptyMessage: string;
  pickAnotherLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState<Source | null>(null);

  const close = () => {
    setOpen(false);
    setChoosing(null);
  };

  const load = (source: Source, mode: RoutineLoadMode) => {
    onLoad((current) => loadRoutineExercises(current, source.exercises, mode), source);
    close();
  };

  const pick = (source: Source) => {
    if (hasEnteredExercises(exercises)) setChoosing(source);
    else load(source, "replace");
  };

  const canAppend = choosing ? canAppendRoutine(exercises, choosing.exercises) : false;

  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpen?.();
          setOpen(true);
        } else close();
      }}
    >
      <BottomSheetTrigger render={<Button variant="outline" />}>
        {triggerIcon}
        {triggerLabel}
      </BottomSheetTrigger>
      <BottomSheetContent>
        {choosing ? (
          <>
            <BottomSheetHeader>
              <BottomSheetTitle>이미 적은 종목이 있어요</BottomSheetTitle>
              <BottomSheetDescription>
                ‘{choosing.title}’ {noun}을 지금 적은 종목 뒤에 붙일까요, 아니면 지금 적은 종목을 지우고 덮어쓸까요?
              </BottomSheetDescription>
            </BottomSheetHeader>
            {!canAppend && (
              <p className="px-5 text-caption text-muted-foreground">
                뒤에 붙이면 종목이 {MAX_EXERCISES}개를 넘어서 덮어쓰기만 할 수 있어요.
              </p>
            )}
            <BottomSheetFooter>
              <Button variant="primary" size="lg" onClick={() => load(choosing, "append")} disabled={!canAppend}>
                뒤에 붙이기
              </Button>
              <Button variant="destructive" size="lg" onClick={() => load(choosing, "replace")}>
                덮어쓰기
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setChoosing(null)}>
                {pickAnotherLabel}
              </Button>
            </BottomSheetFooter>
          </>
        ) : (
          <>
            <BottomSheetHeader>
              <BottomSheetTitle>{listTitle}</BottomSheetTitle>
              <BottomSheetDescription>{listDescription}</BottomSheetDescription>
            </BottomSheetHeader>
            {sources.length > 0 ? (
              <ul className="flex flex-col gap-2 px-5 pb-5">
                {sources.map((source) => (
                  <li key={source.id}>
                    <Button
                      variant="outline"
                      className="h-auto w-full flex-col items-start gap-1 whitespace-normal py-3 text-left"
                      onClick={() => pick(source)}
                    >
                      <span className="break-words font-semibold text-body">{source.title}</span>
                      <span className="break-words font-normal text-caption text-muted-foreground">
                        {source.summary}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-5 text-body text-muted-foreground">{emptyMessage}</p>
            )}
          </>
        )}
      </BottomSheetContent>
    </BottomSheet>
  );
}
