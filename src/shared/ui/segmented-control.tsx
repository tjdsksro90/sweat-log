"use client";

import { cn } from "@/shared/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

export function SegmentedControl<T extends string>({
  label,
  value,
  onValueChange,
  options,
  className,
  disabled,
}: {
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  className?: string;
  disabled?: boolean;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(values) => {
        const next = options.find((option) => option.value === values[0]);
        if (next) onValueChange(next.value);
      }}
      disabled={disabled}
      className={cn("w-full rounded-xl bg-muted p-1", className)}
      spacing={1}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className="min-h-11 min-w-0 flex-1 whitespace-normal rounded-lg px-2 text-caption data-pressed:bg-surface data-pressed:text-foreground data-pressed:shadow-card"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
