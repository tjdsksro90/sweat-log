"use client";

import { type ComponentProps, useEffect, useId, useRef, useState } from "react";

import { PlusIcon } from "@phosphor-icons/react";

import { Input } from "@/shared/ui/input";

import { findExercise, normalizeExerciseName, searchExercises } from "../model/search-exercises";
import { isExerciseBodyPart } from "../model/user-exercise";
import { ExerciseEditorSheet } from "./exercise-editor-sheet";
import { useUserExercises } from "./user-exercises-provider";

const JAMO_ONLY = /^[ㄱ-ㅣ]+$/u;

/**
 * 헬스 종목 이름 combobox. 사전 종목과 내 종목을 초성·부위로 찾는다.
 * 사전·내 종목에 없는 이름이면 목록 맨 아래에 "새 종목으로 추가"가 붙고, 누르면 부위를 고르는 시트가 열린다.
 * 내 종목은 UserExercisesProvider가 있을 때만 읽고 추가한다.
 */
export function ExerciseNameInput({
  value,
  onValueChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const userExercises = useUserExercises();
  const mine = userExercises?.exercises ?? [];
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [adding, setAdding] = useState<string | null>(null);
  // 시트가 닫히며 입력칸으로 포커스가 돌아올 때 목록을 다시 열지 않는다.
  const skipNextFocusOpen = useRef(false);
  const hasQuery = normalizeExerciseName(value).length > 0;
  const matches = hasQuery ? searchExercises(value, mine) : [];
  // 부위 이름("팔")이나 낱자만 적은 초성("ㅋㅇㅂ")은 검색어라 추가를 권하지 않는다.
  const normalized = normalizeExerciseName(value);
  const canAdd =
    Boolean(userExercises) &&
    hasQuery &&
    !isExerciseBodyPart(normalized) &&
    !JAMO_ONLY.test(normalized) &&
    !findExercise(value, mine);
  const optionCount = matches.length + (canAdd ? 1 : 0);
  const addIndex = canAdd ? matches.length : -1;
  const expanded = open && optionCount > 0;
  const active = expanded && activeIndex >= 0 && activeIndex < optionCount ? activeIndex : -1;
  const optionId = (index: number) => `${id}-option-${index}`;
  useEffect(() => {
    if (active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, id]);
  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };
  const select = (index: number) => {
    if (index === addIndex) {
      close();
      skipNextFocusOpen.current = true;
      setAdding(value.trim());
      return;
    }
    onValueChange(matches[index].name);
    close();
    inputRef.current?.focus();
  };
  const choose = (name: string) => {
    skipNextFocusOpen.current = true;
    onValueChange(name);
    close();
  };
  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? `${id}-list` : undefined}
        aria-activedescendant={active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        onFocus={() => {
          setActiveIndex(-1);
          if (skipNextFocusOpen.current) {
            skipNextFocusOpen.current = false;
            return;
          }
          setOpen(true);
        }}
        onBlur={close}
        onChange={(event) => {
          onValueChange(event.target.value);
          setActiveIndex(-1);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && optionCount) {
            event.preventDefault();
            setOpen(true);
            const next =
              event.key === "ArrowDown" ? (active + 1) % optionCount : active <= 0 ? optionCount - 1 : active - 1;
            setActiveIndex(next);
          } else if (event.key === "Enter" && expanded && active >= 0) {
            event.preventDefault();
            select(active);
          } else if (event.key === "Escape") {
            if (expanded) event.preventDefault();
            close();
          } else if (event.key === "Tab") {
            setOpen(false);
          }
        }}
      />
      {expanded && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="헬스 종목 추천"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-card"
        >
          {matches.map((exercise, index) => (
            <li
              key={exercise.userExerciseId ?? exercise.name}
              id={optionId(index)}
              role="option"
              aria-label={`${exercise.name}, ${exercise.bodyPart}${exercise.bodyweight ? ", 맨몸" : ""}${exercise.userExerciseId ? ", 내 종목" : ""}`}
              aria-selected={active === index}
              className="group flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-caption aria-selected:bg-accent aria-selected:text-accent-foreground"
              onPointerDown={(event) => {
                if (event.pointerType === "mouse") event.preventDefault();
              }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(index)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="break-words">{exercise.name}</span>
                {exercise.userExerciseId && (
                  <span className="shrink-0 rounded-full border border-current px-2 text-caption text-muted-foreground group-aria-selected:text-accent-foreground">
                    내 종목
                  </span>
                )}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {exercise.bodyPart}
                {exercise.bodyweight ? " · 맨몸" : ""}
              </span>
            </li>
          ))}
          {canAdd && (
            <li
              id={optionId(addIndex)}
              role="option"
              aria-label={`‘${value.trim()}’ 새 종목으로 추가`}
              aria-selected={active === addIndex}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border-t px-3 py-2 font-medium text-caption first:border-t-0 aria-selected:bg-accent aria-selected:text-accent-foreground"
              onPointerDown={(event) => {
                if (event.pointerType === "mouse") event.preventDefault();
              }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(addIndex)}
            >
              <PlusIcon aria-hidden="true" className="size-4 shrink-0" />
              <span className="break-words">‘{value.trim()}’ 새 종목으로 추가</span>
            </li>
          )}
        </ul>
      )}
      <p className="not-empty:mt-1 text-caption text-muted-foreground" role="status">
        {open && hasQuery && matches.length === 0
          ? canAdd
            ? "추천 종목이 없어요. 입력한 이름 그대로 기록하거나 새 종목으로 추가할 수 있어요."
            : "추천 종목이 없어요. 입력한 이름 그대로 기록할 수 있어요."
          : ""}
      </p>
      {userExercises && (
        <ExerciseEditorSheet
          open={adding !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAdding(null);
          }}
          finalFocus={inputRef}
          title="새 종목 추가"
          description="부위를 골라 내 종목으로 등록하면 다음부터 추천에 떠요."
          submitLabel="내 종목으로 추가"
          initial={{ bodyPart: null, bodyweight: false, name: adding ?? "" }}
          existing={mine}
          onSave={userExercises.save}
          onSaved={(exercise) => choose(exercise.name)}
          onPickDuplicate={(exercise) => choose(exercise.name)}
        />
      )}
    </div>
  );
}
