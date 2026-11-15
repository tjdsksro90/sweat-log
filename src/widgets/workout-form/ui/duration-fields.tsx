import type { DurationFormValues } from "@/features/workout/model/workout-form";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/shared/ui/field";
import { NumberInput } from "@/shared/ui/number-input";

const PARTS = [
  { key: "hours", label: "시간" },
  { key: "minutes", label: "분" },
  { key: "seconds", label: "초" },
] as const;

// 시·분·초를 한 묶음으로 받는다. 오류는 묶음 전체에 하나만 붙는다.
export function DurationFields({
  id,
  legend,
  description,
  value,
  onChange,
  error,
  withSeconds = true,
}: {
  id: string;
  legend: string;
  description?: string;
  value: DurationFormValues;
  onChange: (value: DurationFormValues) => void;
  error?: string;
  withSeconds?: boolean;
}) {
  const parts = withSeconds ? PARTS : PARTS.filter((part) => part.key !== "seconds");
  const describedBy = [description ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");

  return (
    <FieldSet data-invalid={Boolean(error)} className="gap-2">
      <FieldLegend variant="label" className={error ? "text-destructive" : undefined}>
        {legend}
      </FieldLegend>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2">
        {parts.map((part) => (
          <Field key={part.key} className="gap-1">
            <NumberInput
              id={`${id}-${part.key}`}
              inputMode="numeric"
              value={value[part.key]}
              onChange={(event) => onChange({ ...value, [part.key]: event.target.value })}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy || undefined}
              placeholder="0"
              autoComplete="off"
            />
            <FieldLabel htmlFor={`${id}-${part.key}`} className="text-caption text-muted-foreground">
              {part.label}
            </FieldLabel>
          </Field>
        ))}
      </div>
      {description && <FieldDescription id={`${id}-help`}>{description}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </FieldSet>
  );
}
