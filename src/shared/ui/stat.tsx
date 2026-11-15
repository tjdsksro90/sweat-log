import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

export function Stat({
  label,
  value,
  unit,
  size = "lg",
  className,
  ...props
}: ComponentProps<"div"> & { label: string; value: ReactNode; unit?: string; size?: "sm" | "lg" }) {
  return (
    <div className={cn("min-w-0", className)} {...props}>
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cn("break-all font-bold tabular-nums tracking-tight", size === "lg" ? "text-stat" : "text-2xl")}
        >
          {value}
        </span>
        {unit && <span className="text-body text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}
