import { WORKOUT_KIND_LABELS, WORKOUT_KINDS, type WorkoutKind } from "@/entities/workout/model/types";
import type { WorkoutFormValues } from "@/features/workout/model/workout-form";
import type { WorkoutFormErrors } from "@/features/workout/model/workout-input";
import { Field, FieldTitle } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { SegmentedControl } from "@/shared/ui/segmented-control";

import { FormField } from "./form-field";

const KIND_OPTIONS = WORKOUT_KINDS.map((kind) => ({ label: WORKOUT_KIND_LABELS[kind], value: kind }));

// 1단계: 언제, 무엇을
export function BasicsStep({
  values,
  errors,
  today,
  onChange,
}: {
  values: WorkoutFormValues;
  errors: WorkoutFormErrors;
  today: string;
  onChange: (update: (values: WorkoutFormValues) => WorkoutFormValues) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <FormField id="workout-date" label="날짜" error={errors.workoutDate}>
        {(control) => (
          <Input
            {...control}
            type="date"
            max={today}
            value={values.workoutDate}
            onChange={(event) => onChange((current) => ({ ...current, workoutDate: event.target.value }))}
          />
        )}
      </FormField>
      <Field>
        {/* SegmentedControl은 aria-label로 이름을 갖는다. 보이는 제목은 같은 문구로 둔다. */}
        <FieldTitle aria-hidden="true">운동 종류</FieldTitle>
        <SegmentedControl<WorkoutKind>
          label="운동 종류"
          value={values.kind}
          onValueChange={(kind) => onChange((current) => ({ ...current, kind }))}
          options={KIND_OPTIONS}
        />
      </Field>
    </div>
  );
}
