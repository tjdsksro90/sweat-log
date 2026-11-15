"use client";

import { useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { WorkoutListItem } from "@/entities/workout/model/contracts";
import { WORKOUT_KIND_LABELS, WORKOUT_KINDS } from "@/entities/workout/model/types";
import { WorkoutCard } from "@/entities/workout/ui/workout-card";
import { Button } from "@/shared/ui/button";
import { FilterChip } from "@/shared/ui/chip";
import { EmptyState } from "@/shared/ui/empty-state";
import { SegmentedControl } from "@/shared/ui/segmented-control";

import { buildMonthCalendar } from "../model/calendar";
import { getListHref, type ListState, shiftMonth } from "../model/filters";
import { groupWorkoutsByDate } from "../model/timeline";

const DOTS = { run: "bg-workout-run", strength: "bg-workout-strength", other: "bg-workout-other" };

export function WorkoutListView({
  state,
  workouts,
  nextCursor,
}: {
  state: ListState;
  workouts: WorkoutListItem[];
  nextCursor: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const navigate = (changes: Partial<ListState>) =>
    startTransition(() => router.push(getListHref(state, { cursor: undefined, ...changes }), { scroll: false }));
  const visible = selectedDate ? workouts.filter((workout) => workout.workoutDate === selectedDate) : workouts;
  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      <SegmentedControl
        label="기록 보기"
        value={state.view}
        onValueChange={(view) => navigate({ view })}
        disabled={pending}
        options={[
          { value: "timeline", label: "타임라인" },
          { value: "calendar", label: "달력" },
        ]}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="운동 종류">
        <FilterChip selected={state.kind === "all"} disabled={pending} onClick={() => navigate({ kind: "all" })}>
          전체
        </FilterChip>
        {WORKOUT_KINDS.map((kind) => (
          <FilterChip
            key={kind}
            kind={kind}
            selected={state.kind === kind}
            disabled={pending}
            onClick={() => navigate({ kind })}
          />
        ))}
      </div>
      {pending && (
        <p role="status" className="text-caption text-muted-foreground">
          기록을 불러오는 중…
        </p>
      )}
      {state.view === "calendar" && (
        <section aria-label="월별 운동 달력" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              disabled={pending || state.month === "1000-01"}
              aria-label="이전 달"
              onClick={() => navigate({ month: shiftMonth(state.month, -1) })}
            >
              ←
            </Button>
            <h2 className="font-semibold text-title">{state.month.replace("-", "년 ")}월</h2>
            <Button
              variant="ghost"
              disabled={pending || state.month === "9999-12"}
              aria-label="다음 달"
              onClick={() => navigate({ month: shiftMonth(state.month, 1) })}
            >
              →
            </Button>
          </div>
          <div className="grid grid-cols-7 text-center">
            {["월", "화", "수", "목", "금", "토", "일"].map((label) => (
              <span key={label} className="py-2 text-caption text-muted-foreground">
                {label}
              </span>
            ))}
            {buildMonthCalendar(state.month, workouts).map((day, index) =>
              day ? (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date === selectedDate ? null : day.date)}
                  aria-pressed={selectedDate === day.date}
                  aria-label={`${day.date}, ${day.kinds.length ? day.kinds.map((kind) => WORKOUT_KIND_LABELS[kind]).join(", ") : "운동 없음"}`}
                  className="flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 rounded-lg text-caption tabular-nums hover:bg-muted focus-visible:outline-2 aria-pressed:bg-foreground aria-pressed:text-background"
                >
                  {day.day}
                  <span className="flex h-2 gap-1" aria-hidden="true">
                    {day.kinds.map((kind) => (
                      <span key={kind} className={`size-1.5 rounded-full ${DOTS[kind]}`} />
                    ))}
                  </span>
                </button>
              ) : (
                <span key={`blank-${state.month}-${index < 7 ? "start" : "end"}-${index % 7}`} />
              ),
            )}
          </div>
          {selectedDate && (
            <Button variant="outline" onClick={() => setSelectedDate(null)}>
              월 전체 기록 보기
            </Button>
          )}
        </section>
      )}
      {visible.length === 0 ? (
        <EmptyState
          icon={<span>○</span>}
          title={selectedDate ? "이날은 기록이 없어요" : "아직 기록이 없어요"}
          description="다른 날짜나 운동 종류를 선택하거나 오늘의 움직임을 남겨 보세요."
          action={
            <Button render={<Link href="/workouts/new" />} nativeButton={false} role="link">
              운동 기록하기
            </Button>
          }
        />
      ) : (
        groupWorkoutsByDate(visible).map((group) => (
          <section key={group.date} className="flex flex-col gap-3" aria-label={`${group.date} 기록`}>
            <h2 className="font-semibold text-caption">
              <time dateTime={group.date}>{group.date}</time>
            </h2>
            {group.workouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </section>
        ))
      )}
      {state.view === "timeline" && state.cursor && (
        <Button variant="ghost" onClick={() => navigate({ cursor: undefined })}>
          최신 기록으로
        </Button>
      )}
      {state.view === "timeline" && nextCursor && (
        <Button variant="outline" disabled={pending} onClick={() => navigate({ cursor: nextCursor })}>
          더 보기
        </Button>
      )}
    </div>
  );
}
