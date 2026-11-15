import { changeCrew, toggleCompanion, type WorkoutFormValues } from "@/features/workout/model/workout-form";
import { LIMITS, type WorkoutFormErrors } from "@/features/workout/model/workout-input";
import { FilterChip } from "@/shared/ui/chip";
import { FieldDescription, FieldLegend, FieldSet } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

import type { WorkoutFormCrew } from "../model/types";
import { FormField } from "./form-field";

// 3단계: 제목·장소·메모, 공유할 크루와 함께한 친구
export function FinishStep({
  values,
  errors,
  crews,
  onChange,
}: {
  values: WorkoutFormValues;
  errors: WorkoutFormErrors;
  crews: WorkoutFormCrew[];
  onChange: (update: (values: WorkoutFormValues) => WorkoutFormValues) => void;
}) {
  const selectedCrew = crews.find((crew) => crew.id === values.crewId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <FormField id="workout-title" label="제목 (선택)" error={errors.title}>
        {(control) => (
          <Input
            {...control}
            value={values.title}
            onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))}
            maxLength={LIMITS.title}
            placeholder="한강 새벽 러닝"
            autoComplete="off"
          />
        )}
      </FormField>
      <FormField id="workout-place" label="장소 (선택)" error={errors.placeName}>
        {(control) => (
          <Input
            {...control}
            value={values.placeName}
            onChange={(event) => onChange((current) => ({ ...current, placeName: event.target.value }))}
            maxLength={LIMITS.placeName}
            placeholder="반포한강공원"
            autoComplete="off"
          />
        )}
      </FormField>
      <FormField id="workout-memo" label="메모 (선택)" error={errors.memo}>
        {(control) => (
          <Textarea
            {...control}
            value={values.memo}
            onChange={(event) => onChange((current) => ({ ...current, memo: event.target.value }))}
            maxLength={LIMITS.memo}
            rows={4}
          />
        )}
      </FormField>

      <FieldSet className="gap-3">
        <FieldLegend variant="label">공유할 크루</FieldLegend>
        {crews.length === 0 ? (
          <FieldDescription>크루에 들어가면 친구들과 기록을 나눌 수 있어요. 지금은 나만 봐요.</FieldDescription>
        ) : (
          <>
            <FieldDescription>크루를 고르면 크루 친구들이 이 기록을 볼 수 있어요.</FieldDescription>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                selected={values.crewId === null}
                onClick={() => onChange((current) => changeCrew(current, null))}
              >
                나만 보기
              </FilterChip>
              {crews.map((crew) => (
                <FilterChip
                  key={crew.id}
                  selected={values.crewId === crew.id}
                  onClick={() =>
                    onChange((current) =>
                      changeCrew(
                        current,
                        crew.id,
                        crew.members.map((member) => member.userId),
                      ),
                    )
                  }
                >
                  {crew.name}
                </FilterChip>
              ))}
            </div>
          </>
        )}
      </FieldSet>

      {selectedCrew && (
        <FieldSet className="gap-3">
          <FieldLegend variant="label">함께한 친구 (선택)</FieldLegend>
          {selectedCrew.members.length === 0 ? (
            <FieldDescription>아직 {selectedCrew.name}에 다른 친구가 없어요.</FieldDescription>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedCrew.members.map((member) => (
                <FilterChip
                  key={member.userId}
                  selected={values.companionIds.includes(member.userId)}
                  onClick={() => onChange((current) => toggleCompanion(current, member.userId))}
                >
                  {member.nickname}
                </FilterChip>
              ))}
            </div>
          )}
        </FieldSet>
      )}
    </div>
  );
}
