import { getRunPacePreview, type RunFormValues } from "@/features/workout/model/workout-form";
import type { WorkoutFormErrors } from "@/features/workout/model/workout-input";
import { NumberInput } from "@/shared/ui/number-input";
import { Stat } from "@/shared/ui/stat";

import { DurationFields } from "./duration-fields";
import { FormField } from "./form-field";

export function RunDetail({
  run,
  errors,
  onChange,
}: {
  run: RunFormValues;
  errors: WorkoutFormErrors;
  onChange: (run: RunFormValues) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <FormField
        id="run-distance"
        label="거리 (km)"
        description="소수 둘째 자리까지 적을 수 있어요."
        error={errors["run.distanceKm"]}
      >
        {(control) => (
          <NumberInput
            {...control}
            value={run.distanceKm}
            onChange={(event) => onChange({ ...run, distanceKm: event.target.value })}
            placeholder="5.00"
            autoComplete="off"
          />
        )}
      </FormField>
      <DurationFields
        id="run-duration"
        legend="달린 시간"
        value={run.duration}
        onChange={(duration) => onChange({ ...run, duration })}
        error={errors["run.duration"]}
      />
      <output aria-live="polite" className="rounded-xl bg-muted p-4">
        <Stat label="페이스" value={getRunPacePreview(run)} unit="/km" size="sm" />
      </output>
    </div>
  );
}
