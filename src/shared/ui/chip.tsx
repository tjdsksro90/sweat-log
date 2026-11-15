import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

const DOTS = { run: "bg-workout-run", strength: "bg-workout-strength", other: "bg-workout-other" };
const LABELS = { run: "러닝", strength: "헬스", other: "기타" };
type Kind = keyof typeof DOTS;

export function Chip({ kind, className, ...props }: ComponentProps<"span"> & { kind: Kind }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1.5 text-caption",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOTS[kind])} />
      {LABELS[kind]}
    </span>
  );
}

export function FilterChip({
  selected = false,
  kind,
  children,
  className,
  ...props
}: ComponentProps<"button"> & { selected?: boolean; kind?: Kind }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-caption outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        selected ? "border-foreground bg-foreground text-background hover:bg-foreground" : "bg-surface",
        className,
      )}
      {...props}
    >
      {kind && <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOTS[kind])} />}
      {children ?? (kind ? LABELS[kind] : null)}
    </button>
  );
}
