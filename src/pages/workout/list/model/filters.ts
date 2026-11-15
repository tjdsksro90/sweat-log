import { isWorkoutKind, type WorkoutKind } from "@/entities/workout/model/types";

export type ListState = { view: "timeline" | "calendar"; kind: WorkoutKind | "all"; month: string; pages: number };
export type SearchParams = Record<string, string | string[] | undefined>;

export const parseListState = (params: SearchParams, currentMonth: string): ListState => ({
  view: params.view === "calendar" ? "calendar" : "timeline",
  kind: typeof params.kind === "string" && isWorkoutKind(params.kind) ? params.kind : "all",
  month:
    typeof params.month === "string" && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : currentMonth,
  pages: typeof params.pages === "string" && /^[1-9]\d?$/.test(params.pages) ? Number(params.pages) : 1,
});

export const getListHref = (state: ListState, changes: Partial<ListState> = {}) => {
  const next = { ...state, ...changes };
  const params = new URLSearchParams({
    view: next.view,
    kind: next.kind,
    month: next.month,
    pages: String(next.pages),
  });
  return `/workouts?${params}`;
};

export const shiftMonth = (month: string, offset: number) => {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
};
