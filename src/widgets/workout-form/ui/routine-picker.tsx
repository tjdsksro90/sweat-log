"use client";

import { useState } from "react";

import { ClipboardTextIcon } from "@phosphor-icons/react";

import { describeRoutine, type Routine } from "@/entities/routine/model/routine";
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

/**
 * 헬스 상세에서 내 루틴을 골라 종목·세트를 채운다. 값을 복사하므로 불러온 뒤 평소처럼 고칠 수 있다.
 * 이미 적은 종목이 있으면 덮어쓸지 뒤에 붙일지 한 번 더 묻는다.
 */
export function RoutinePicker({
  routines,
  exercises,
  onLoad,
}: {
  routines: Routine[];
  exercises: Exercises;
  onLoad: (update: (exercises: Exercises) => Exercises) => void;
}) {
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState<Routine | null>(null);
  const [loadedName, setLoadedName] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setChoosing(null);
  };

  const load = (routine: Routine, mode: RoutineLoadMode) => {
    onLoad((current) => loadRoutineExercises(current, routine.exercises, mode));
    setLoadedName(routine.name);
    close();
  };

  const pick = (routine: Routine) => {
    if (hasEnteredExercises(exercises)) setChoosing(routine);
    else load(routine, "replace");
  };

  const canAppend = choosing ? canAppendRoutine(exercises, choosing.exercises) : false;

  return (
    <div className="flex flex-col gap-2">
      <BottomSheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setLoadedName(null);
            setOpen(true);
          } else close();
        }}
      >
        <BottomSheetTrigger render={<Button variant="outline" className="self-start" />}>
          <ClipboardTextIcon />
          루틴 불러오기
        </BottomSheetTrigger>
        <BottomSheetContent>
          {choosing ? (
            <>
              <BottomSheetHeader>
                <BottomSheetTitle>이미 적은 종목이 있어요</BottomSheetTitle>
                <BottomSheetDescription>
                  ‘{choosing.name}’ 루틴을 지금 적은 종목 뒤에 붙일까요, 아니면 지금 적은 종목을 지우고 덮어쓸까요?
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
                  다른 루틴 고르기
                </Button>
              </BottomSheetFooter>
            </>
          ) : (
            <>
              <BottomSheetHeader>
                <BottomSheetTitle>어떤 루틴을 불러올까요?</BottomSheetTitle>
                <BottomSheetDescription>
                  루틴의 종목과 세트를 채워 드려요. 불러온 뒤에도 무게와 횟수를 고칠 수 있어요.
                </BottomSheetDescription>
              </BottomSheetHeader>
              {routines.length > 0 ? (
                <ul className="flex flex-col gap-2 px-5 pb-5">
                  {routines.map((routine) => (
                    <li key={routine.id}>
                      <Button
                        variant="outline"
                        className="h-auto w-full flex-col items-start gap-1 whitespace-normal py-3 text-left"
                        onClick={() => pick(routine)}
                      >
                        <span className="break-words font-semibold text-body">{routine.name}</span>
                        <span className="break-words font-normal text-caption text-muted-foreground">
                          {describeRoutine(routine)}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 pb-5 text-body text-muted-foreground">
                  저장한 루틴이 없어요. 설정의 ‘내 루틴’에서 만들거나, 헬스 기록 상세에서 그 구성으로 만들 수 있어요.
                </p>
              )}
            </>
          )}
        </BottomSheetContent>
      </BottomSheet>
      <p role="status" className="text-caption text-muted-foreground empty:sr-only">
        {loadedName ? `‘${loadedName}’ 루틴을 불러왔어요. 무게와 횟수는 바로 고칠 수 있어요.` : ""}
      </p>
    </div>
  );
}
