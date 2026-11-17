import { PlusIcon, TrashIcon } from "@phosphor-icons/react";

import { findExercise } from "@/entities/exercise/model/search-exercises";
import { ExerciseNameInput } from "@/entities/exercise/ui/exercise-name-input";
import {
  addExercise,
  addSet,
  MAX_EXERCISES,
  MAX_SETS_PER_EXERCISE,
  removeExercise,
  removeSet,
  renameExercise,
  type StrengthExerciseFormValues,
  updateSet,
  type WorkoutFormValues,
} from "@/features/workout/model/workout-form";
import {
  acceptDecimal2Input,
  exerciseErrorKey,
  setErrorKey,
  type WorkoutFormErrors,
} from "@/features/workout/model/workout-input";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { FieldError } from "@/shared/ui/field";
import { NumberInput } from "@/shared/ui/number-input";

import { FormField } from "./form-field";

// 세트 번호 · 무게 · 횟수 · 삭제
const SET_ROW = "grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-start gap-2";

type Update = (update: (values: WorkoutFormValues) => WorkoutFormValues) => void;

function ExerciseCard({
  exercise,
  index,
  errors,
  onChange,
}: {
  exercise: StrengthExerciseFormValues;
  index: number;
  errors: WorkoutFormErrors;
  onChange: Update;
}) {
  const label = `${index + 1}번째 종목`;
  const bodyweight = findExercise(exercise.name)?.bodyweight;
  const hintId = `exercise-${exercise.key}-bodyweight`;
  const nameError = errors[`${exerciseErrorKey(exercise.key)}.name`];
  const setsError = errors[`${exerciseErrorKey(exercise.key)}.sets`];

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <FormField id={`exercise-${exercise.key}-name`} label={label} error={nameError}>
              {(control) => (
                <ExerciseNameInput
                  {...control}
                  value={exercise.name}
                  onValueChange={(name) => onChange((values) => renameExercise(values, exercise.key, name))}
                  placeholder="스쿼트"
                  autoComplete="off"
                />
              )}
            </FormField>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${label} 삭제`}
            onClick={() => onChange((values) => removeExercise(values, exercise.key))}
            className={nameError ? "mb-7" : undefined}
          >
            <TrashIcon />
          </Button>
        </div>

        <p id={hintId} role="status" className="text-caption text-muted-foreground empty:sr-only">
          {bodyweight ? "맨몸 종목이에요. 추가 중량이 없다면 무게 칸을 비워 두세요." : ""}
        </p>

        {/* 단위는 입력 안이 아니라 열 제목에 둔다. 좁은 화면에서도 100.25 같은 값이 다 보이게. */}
        <div aria-hidden="true" className={`${SET_ROW} -mb-2 text-caption text-muted-foreground`}>
          <span />
          <span>무게 (kg)</span>
          <span>횟수</span>
        </div>
        <ol className="flex flex-col gap-3">
          {exercise.sets.map((set, setIndex) => {
            const setLabel = `${label} ${setIndex + 1}세트`;
            const weightId = `set-${set.key}-weight`;
            const repsId = `set-${set.key}-reps`;
            const weightError = errors[setErrorKey(exercise.key, set.key, "weightKg")];
            const repsError = errors[setErrorKey(exercise.key, set.key, "reps")];

            return (
              <li key={set.key} className={SET_ROW}>
                <span className="pt-3 text-caption text-muted-foreground tabular-nums">{setIndex + 1}세트</span>
                <FormField
                  id={weightId}
                  label={<span className="sr-only">{setLabel} 무게 (kg)</span>}
                  error={weightError}
                >
                  {(control) => (
                    <NumberInput
                      {...control}
                      aria-describedby={
                        [control["aria-describedby"], bodyweight ? hintId : null].filter(Boolean).join(" ") || undefined
                      }
                      value={set.weightKg}
                      onChange={(event) =>
                        onChange((values) =>
                          updateSet(values, exercise.key, set.key, {
                            weightKg: acceptDecimal2Input(event.target.value, set.weightKg),
                          }),
                        )
                      }
                      autoComplete="off"
                    />
                  )}
                </FormField>
                <FormField id={repsId} label={<span className="sr-only">{setLabel} 횟수</span>} error={repsError}>
                  {(control) => (
                    <NumberInput
                      {...control}
                      inputMode="numeric"
                      value={set.reps}
                      onChange={(event) =>
                        onChange((values) => updateSet(values, exercise.key, set.key, { reps: event.target.value }))
                      }
                      placeholder="0"
                      autoComplete="off"
                    />
                  )}
                </FormField>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${setLabel} 삭제`}
                  onClick={() => onChange((values) => removeSet(values, exercise.key, set.key))}
                >
                  <TrashIcon />
                </Button>
              </li>
            );
          })}
        </ol>
        {setsError && <FieldError>{setsError}</FieldError>}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange((values) => addSet(values, exercise.key))}
          disabled={exercise.sets.length >= MAX_SETS_PER_EXERCISE}
        >
          <PlusIcon />
          세트 추가
        </Button>
      </CardContent>
    </Card>
  );
}

// 무게를 비우면 맨몸 운동. 새 세트는 직전 세트 값을 복사한다(addSet).
export function StrengthDetail({
  exercises,
  errors,
  onChange,
}: {
  exercises: StrengthExerciseFormValues[];
  errors: WorkoutFormErrors;
  onChange: Update;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-muted-foreground">무게를 비우면 맨몸 운동으로 저장해요.</p>
      {exercises.map((exercise, index) => (
        <ExerciseCard key={exercise.key} exercise={exercise} index={index} errors={errors} onChange={onChange} />
      ))}
      {errors.exercises && <FieldError>{errors.exercises}</FieldError>}
      <Button variant="secondary" onClick={() => onChange(addExercise)} disabled={exercises.length >= MAX_EXERCISES}>
        <PlusIcon />
        종목 추가
      </Button>
    </div>
  );
}
