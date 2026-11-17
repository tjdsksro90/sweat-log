"use client";

import { type ComponentProps, useEffect, useId, useRef, useState } from "react";

import { Input } from "@/shared/ui/input";

import { searchExercises } from "../model/search-exercises";

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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const matches = searchExercises(value);
  const expanded = open && matches.length > 0;
  const active = expanded && activeIndex >= 0 && activeIndex < matches.length ? activeIndex : -1;
  const optionId = (index: number) => `${id}-option-${index}`;
  useEffect(() => {
    if (active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, id]);
  const select = (index: number) => {
    onValueChange(matches[index].name);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
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
          setOpen(true);
          setActiveIndex(-1);
        }}
        onBlur={() => {
          setOpen(false);
          setActiveIndex(-1);
        }}
        onChange={(event) => {
          onValueChange(event.target.value);
          setActiveIndex(-1);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && matches.length) {
            event.preventDefault();
            setOpen(true);
            const next =
              event.key === "ArrowDown" ? (active + 1) % matches.length : active <= 0 ? matches.length - 1 : active - 1;
            setActiveIndex(next);
          } else if (event.key === "Enter" && expanded && active >= 0) {
            event.preventDefault();
            select(active);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            setActiveIndex(-1);
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
              key={exercise.name}
              id={optionId(index)}
              role="option"
              aria-label={`${exercise.name}, ${exercise.bodyPart}${exercise.bodyweight ? ", 맨몸" : ""}`}
              aria-selected={active === index}
              className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-caption aria-selected:bg-accent aria-selected:text-accent-foreground"
              onPointerDown={(event) => {
                if (event.pointerType === "mouse") event.preventDefault();
              }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(index)}
            >
              <span>{exercise.name}</span>
              <span className="shrink-0 text-muted-foreground">
                {exercise.bodyPart}
                {exercise.bodyweight ? " · 맨몸" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && matches.length === 0 && (
        <p className="mt-1 text-caption text-muted-foreground" role="status">
          추천 종목이 없어요. 입력한 이름 그대로 기록할 수 있어요.
        </p>
      )}
    </div>
  );
}
