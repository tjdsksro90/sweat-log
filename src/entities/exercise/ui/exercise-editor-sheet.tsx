"use client";

import { type ReactNode, type RefObject, useId, useState } from "react";

import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/shared/ui/bottom-sheet";
import { Button } from "@/shared/ui/button";
import { FilterChip } from "@/shared/ui/chip";
import { Input } from "@/shared/ui/input";

import { EXERCISE_BODY_PARTS, type ExerciseBodyPart } from "../model/exercises";
import type { ExerciseOption } from "../model/search-exercises";
import {
  describeDuplicate,
  findDuplicateExercise,
  parseUserExerciseInput,
  type SaveUserExerciseResult,
  USER_EXERCISE_LIMITS,
  type UserExercise,
  type UserExerciseInput,
} from "../model/user-exercise";

export type ExerciseEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  initial: UserExerciseInput;
  // 이미 있는 내 종목. 저장 전에 이름이 겹치는지 바로 본다(서버도 한 번 더 본다).
  existing: readonly UserExercise[];
  onSave: (input: UserExerciseInput) => Promise<SaveUserExerciseResult>;
  onSaved: (exercise: UserExercise) => void;
  // 이름이 겹칠 때 "그 종목 고르기"를 보여 준다. 없으면 안내만 한다.
  onPickDuplicate?: (exercise: ExerciseOption) => void;
  // 이름을 바꿀 때 덧붙이는 안내(예: 지난 기록은 그대로)
  notice?: ReactNode;
  finalFocus?: RefObject<HTMLElement | null>;
};

/**
 * 내 종목 만들기·고치기 시트. 부위(6개 중 하나, 필수)와 맨몸 여부를 고른다.
 * 기록 폼 안에서 열리므로 <form>을 쓰지 않는다. 포털이어도 React 이벤트는 바깥 기록 폼으로 올라가서
 * submit이 기록 저장으로 이어질 수 있다. 저장은 버튼과 이름 칸의 Enter로만 한다.
 */
export function ExerciseEditorSheet({ open, onOpenChange, finalFocus, ...props }: ExerciseEditorProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent finalFocus={finalFocus}>
        {open && <ExerciseEditorBody {...props} onClose={() => onOpenChange(false)} />}
      </BottomSheetContent>
    </BottomSheet>
  );
}

function ExerciseEditorBody({
  title,
  description,
  submitLabel,
  initial,
  existing,
  onSave,
  onSaved,
  onPickDuplicate,
  notice,
  onClose,
}: Omit<ExerciseEditorProps, "open" | "onOpenChange" | "finalFocus"> & { onClose: () => void }) {
  const id = useId();
  const [name, setName] = useState(initial.name);
  const [bodyPart, setBodyPart] = useState<ExerciseBodyPart | null>(initial.bodyPart);
  const [bodyweight, setBodyweight] = useState(initial.bodyweight);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<ExerciseOption | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (pending) return;
    const input = { bodyPart, bodyweight, id: initial.id, name };
    const parsed = parseUserExerciseInput(input);
    if (!parsed.ok) {
      setDuplicate(null);
      setError(parsed.error);
      return;
    }
    const found = findDuplicateExercise(parsed.input.name, existing, initial.id);
    if (found) {
      setDuplicate(found);
      setError(null);
      return;
    }
    setPending(true);
    try {
      const result = await onSave(parsed.input);
      if (result.ok) {
        onSaved(result.exercise);
        onClose();
        return;
      }
      setDuplicate(result.duplicate ?? null);
      setError(result.duplicate ? null : result.error);
    } catch {
      setDuplicate(null);
      setError("종목을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <BottomSheetHeader>
        <BottomSheetTitle>{title}</BottomSheetTitle>
        <BottomSheetDescription>{description}</BottomSheetDescription>
      </BottomSheetHeader>
      <div className="flex flex-col gap-5 px-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-name`} className="font-medium text-sm">
            종목 이름
          </label>
          <Input
            id={`${id}-name`}
            value={name}
            maxLength={USER_EXERCISE_LIMITS.name * 2}
            autoComplete="off"
            onChange={(event) => {
              setName(event.target.value);
              setDuplicate(null);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
              if (event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
          />
          {notice && <p className="text-caption text-muted-foreground">{notice}</p>}
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium text-sm">
            부위 <span className="text-muted-foreground">(하나 골라 주세요)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {EXERCISE_BODY_PARTS.map((part) => (
              <FilterChip
                key={part}
                selected={bodyPart === part}
                onClick={() => {
                  setBodyPart(part);
                  setError(null);
                }}
              >
                {part}
              </FilterChip>
            ))}
          </div>
        </fieldset>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body">
          <input
            type="checkbox"
            className="size-5 shrink-0 accent-primary"
            checked={bodyweight}
            onChange={(event) => setBodyweight(event.target.checked)}
            aria-describedby={`${id}-bodyweight-hint`}
          />
          <span className="flex flex-col">
            맨몸 운동이에요
            <span id={`${id}-bodyweight-hint`} className="text-caption text-muted-foreground">
              무게 없이 횟수만 적는 운동이면 체크해 주세요.
            </span>
          </span>
        </label>
        <div role="alert" className="flex flex-col gap-2 text-caption empty:hidden">
          {error && <p className="text-destructive">{error}</p>}
          {duplicate && (
            <>
              <p>{describeDuplicate(duplicate)} 새로 만들지 않고 그 종목을 쓰면 최고 무게도 함께 모여요.</p>
              {onPickDuplicate && (
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={() => {
                    onPickDuplicate(duplicate);
                    onClose();
                  }}
                >
                  ‘{duplicate.name}’ 고르기
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      <BottomSheetFooter>
        <Button variant="primary" size="lg" onClick={() => void submit()} disabled={pending}>
          {pending ? "저장하는 중…" : submitLabel}
        </Button>
        <BottomSheetClose render={<Button variant="secondary" size="lg" />}>취소</BottomSheetClose>
      </BottomSheetFooter>
    </>
  );
}
