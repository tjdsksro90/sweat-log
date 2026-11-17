import type { Routine } from "@/entities/routine/model/routine";
import type { WorkoutFormValues } from "@/features/workout/model/workout-form";
import type { WorkoutFormErrors } from "@/features/workout/model/workout-input";

import { DurationFields } from "./duration-fields";
import { RunDetail } from "./run-detail";
import { StrengthDetail } from "./strength-detail";

// 2단계: 종류별 상세
export function DetailStep({
  values,
  errors,
  onChange,
  routines,
}: {
  values: WorkoutFormValues;
  errors: WorkoutFormErrors;
  onChange: (update: (values: WorkoutFormValues) => WorkoutFormValues) => void;
  routines?: Routine[];
}) {
  if (values.kind === "run") {
    return (
      <RunDetail run={values.run} errors={errors} onChange={(run) => onChange((current) => ({ ...current, run }))} />
    );
  }

  const isStrength = values.kind === "strength";

  return (
    <div className="flex flex-col gap-6">
      {isStrength && (
        <StrengthDetail
          exercises={values.exercises}
          errors={errors}
          onChange={(change) => onChange((current) => ({ ...current, exercises: change(current.exercises) }))}
          routines={routines}
        />
      )}
      <DurationFields
        id="workout-duration"
        legend={isStrength ? "전체 운동 시간 (선택)" : "운동한 시간"}
        value={values.duration}
        onChange={(duration) => onChange((current) => ({ ...current, duration }))}
        error={errors.duration}
        withSeconds={false}
      />
    </div>
  );
}
