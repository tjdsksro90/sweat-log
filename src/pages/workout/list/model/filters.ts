import { isWorkoutKind, type WorkoutKind } from "@/entities/workout/model/types";

export type ListState = { view: "timeline" | "calendar"; kind: WorkoutKind | "all"; month: string; cursor?: string };
export type SearchParams = Record<string, string | string[] | undefined>;

export const parseListState = (params: SearchParams, currentMonth: string): ListState => ({
  view: params.view === "calendar" ? "calendar" : "timeline",
  kind: typeof params.kind === "string" && isWorkoutKind(params.kind) ? params.kind : "all",
  month:
    typeof params.month === "string" && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : currentMonth,
  cursor: typeof params.cursor === "string" ? params.cursor : undefined,
});

export const getListHref = (state: ListState, changes: Partial<ListState> = {}) => {
  const next = { ...state, ...changes };
  const params = new URLSearchParams({
    view: next.view,
    kind: next.kind,
    month: next.month,
  });
  if (next.cursor) params.set("cursor", next.cursor);
  return `/workouts?${params}`;
};

export const shiftMonth = (month: string, offset: number) => {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
};
