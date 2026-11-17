"use client";

import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";

import { TrashIcon, XIcon } from "@phosphor-icons/react";

import type { Routine } from "@/entities/routine/model/routine";
import type { WorkoutPhoto } from "@/entities/workout/model/contracts";
import {
  isWorkoutFormDirty,
  WORKOUT_FORM_STEP_LABELS,
  WORKOUT_FORM_STEPS,
  type WorkoutFormValues,
} from "@/features/workout/model/workout-form";
import { toWorkoutInput, validateWorkoutStep } from "@/features/workout/model/workout-input";
import { isPhotoDraftDirty, type PhotoActions, syncPhotoDraft } from "@/features/workout-photo/model/photo-draft";
import { usePhotoDraft } from "@/features/workout-photo/model/use-photo-draft";
import { PhotoPicker } from "@/features/workout-photo/ui/photo-picker";
import { useAppRouter } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { FieldError } from "@/shared/ui/field";

import type { DeleteWorkoutAction, SaveWorkoutAction, WorkoutFormCrew, WorkoutFormMember } from "../model/types";
import { useLeaveGuard } from "../model/use-leave-guard";
import { BasicsStep } from "./basics-step";
import { ConfirmSheet } from "./confirm-sheet";
import { DetailStep } from "./detail-step";
import { FinishStep } from "./finish-step";

type WorkoutFormProps = {
  title: string;
  initialValues: WorkoutFormValues;
  crews: WorkoutFormCrew[];
  existingCompanions?: WorkoutFormMember[]; // 수정 화면에만. 기록에 이미 있는 동행자
  today: string;
  closeHref: string;
  saveWorkout: SaveWorkoutAction;
  deleteWorkout?: DeleteWorkoutAction; // 수정 화면에만
  initialPhotos?: WorkoutPhoto[]; // 수정 화면에만. 기록에 이미 붙은 사진
  photoActions?: PhotoActions; // 없으면 사진 고르기를 보여 주지 않는다
  photoUnavailableMessage?: string; // 체험 데모처럼 사진을 막을 때 고르기 자리에 보여 줄 안내
  routines?: Routine[]; // 헬스 상세에서 불러올 내 루틴. 없으면 불러오기를 보여 주지 않는다
};

/**
 * 단계형 작성·수정 폼. 1 언제·무엇 → 2 상세 → 3 마무리.
 * 값 변환·검증은 features/workout/model, 저장은 prop으로 받은 Server Action이 맡는다.
 */
export function WorkoutForm({
  title,
  initialValues,
  crews,
  existingCompanions = [],
  today,
  closeHref,
  saveWorkout,
  deleteWorkout,
  initialPhotos,
  photoActions,
  photoUnavailableMessage,
  routines,
}: WorkoutFormProps) {
  const router = useAppRouter();
  const [values, setValues] = useState(initialValues);
  const [stepIndex, setStepIndex] = useState(0);
  // 다음·저장을 한 번 누른 뒤부터 오류를 보여주고, 고치는 대로 다시 계산한다.
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // 기록은 저장됐는데 사진 일부를 반영하지 못한 기록 id. 사진은 두고 기록을 보러 갈 수 있게 한다.
  const [savedWithPhotoError, setSavedWithPhotoError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  const bodyRef = useRef<HTMLDivElement>(null);

  const step = WORKOUT_FORM_STEPS[stepIndex];
  const isLastStep = stepIndex === WORKOUT_FORM_STEPS.length - 1;
  const errors = showErrors ? validateWorkoutStep(values, step, today) : {};
  const photos = usePhotoDraft(initialPhotos);
  const showPhotos = Boolean(photoActions || photoUnavailableMessage);
  const isDirty = isWorkoutFormDirty(initialValues, values) || isPhotoDraftDirty(photos.draft);
  const guard = useLeaveGuard(isDirty);

  /**
   * 오류를 보여주면 첫 오류 입력으로, 단계를 옮기면 단계 제목으로 포커스를 옮긴다.
   * 같은 대상을 다시 요청해도 실행되도록 요청마다 새 객체를 만든다. 처음 열 때는 요청이 없어 옮기지 않는다.
   */
  const [focusRequest, setFocusRequest] = useState<{ target: "error" | "heading" } | null>(null);
  useEffect(() => {
    const body = bodyRef.current;
    if (!focusRequest || !body) return;
    const selector = focusRequest.target === "error" ? '[aria-invalid="true"]' : "h2";
    body.querySelector<HTMLElement>(selector)?.focus();
  }, [focusRequest]);

  const showStepErrors = () => {
    setShowErrors(true);
    setFocusRequest({ target: "error" });
  };

  const update = (change: (current: WorkoutFormValues) => WorkoutFormValues) => {
    setServerError(null);
    setValues(change);
  };

  const goToStep = (index: number) => {
    setShowErrors(false);
    setStepIndex(index);
    setFocusRequest({ target: "heading" });
    window.scrollTo({ top: 0 });
  };

  const save = () => {
    const result = toWorkoutInput(values, today);
    if (!result.ok) {
      setStepIndex(WORKOUT_FORM_STEPS.indexOf(result.step));
      showStepErrors();
      return;
    }

    startSaving(async () => {
      const saved = await saveWorkout(result.input);
      if (!saved.ok) {
        setServerError(saved.error);
        return;
      }

      /**
       * 사진은 기록을 저장한 뒤에 반영한다(새 기록은 그때 id가 생긴다). 사진이 실패해도 기록은 되돌리지 않는다.
       * 폼을 수정 상태(id 있음)로 바꾸고 실패한 사진만 남겨 두어, 다시 저장하면 기록을 갱신하고 남은 사진만 다시 시도한다.
       */
      if (photoActions && isPhotoDraftDirty(photos.draft)) {
        const synced = await syncPhotoDraft(photos.draft, saved.id, photoActions);
        photos.setDraft(synced.draft);
        if (synced.failedCount > 0) {
          setValues((current) => ({ ...current, id: saved.id }));
          setSavedWithPhotoError(saved.id);
          setServerError(
            `기록은 저장했어요. 사진 ${synced.failedCount}장은 반영하지 못했어요.${synced.firstError ? ` ${synced.firstError}` : ""} 다시 저장하면 남은 사진만 다시 시도해요.`,
          );
          return;
        }
      }

      guard.allowLeave();
      router.replace(`/workouts/${saved.id}`);
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    if (Object.keys(validateWorkoutStep(values, step, today)).length > 0) {
      showStepErrors();
      return;
    }
    // 사진을 줄이는 중에 저장하면 그 사진이 빠진 채 저장된다.
    if (isLastStep) {
      if (!photos.isPreparing) save();
    } else goToStep(stepIndex + 1);
  };

  const handleDelete = () => {
    if (!deleteWorkout || !initialValues.id) return;
    const id = initialValues.id;

    startDeleting(async () => {
      const deleted = await deleteWorkout(id);
      if (!deleted.ok) {
        setDeleteError(deleted.error);
        return;
      }
      guard.allowLeave();
      router.replace("/workouts");
    });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-page pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+7rem)]">
      <header className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="닫기"
          onClick={() => guard.requestLeave(() => router.push(closeHref))}
          className="-ml-3"
        >
          <XIcon size={24} />
        </Button>
        <h1 className="min-w-0 flex-1 break-words font-bold text-title">{title}</h1>
        {deleteWorkout && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="기록 삭제"
            onClick={() => {
              setDeleteError(null);
              setIsDeleteOpen(true);
            }}
          >
            <TrashIcon size={22} />
          </Button>
        )}
      </header>

      <ol aria-label="작성 단계" className="grid grid-cols-3 gap-2">
        {WORKOUT_FORM_STEPS.map((item, index) => (
          <li
            key={item}
            aria-current={index === stepIndex ? "step" : undefined}
            className="flex flex-col gap-1.5 text-caption text-muted-foreground aria-[current=step]:font-semibold aria-[current=step]:text-foreground"
          >
            <span
              aria-hidden="true"
              className={index <= stepIndex ? "h-1 rounded-full bg-foreground" : "h-1 rounded-full bg-muted"}
            />
            <span>
              <span className="sr-only">{index + 1}단계 </span>
              {WORKOUT_FORM_STEP_LABELS[item]}
            </span>
          </li>
        ))}
      </ol>

      <form noValidate onSubmit={handleSubmit} aria-label={title} className="flex flex-1 flex-col gap-section">
        <div ref={bodyRef} className="flex flex-col gap-6">
          <h2 tabIndex={-1} className="font-semibold text-title outline-none">
            {stepIndex + 1}. {WORKOUT_FORM_STEP_LABELS[step]}
          </h2>
          {step === "basics" && <BasicsStep values={values} errors={errors} today={today} onChange={update} />}
          {step === "detail" && <DetailStep values={values} errors={errors} onChange={update} routines={routines} />}
          {step === "finish" && (
            <FinishStep
              values={values}
              errors={errors}
              crews={crews}
              existingCompanions={existingCompanions}
              onChange={update}
            />
          )}
          {step === "finish" && showPhotos && (
            <PhotoPicker
              draft={photos.draft}
              isPreparing={photos.isPreparing}
              onPreparingChange={photos.setIsPreparing}
              onAdd={(picked) => {
                setServerError(null);
                photos.addPhotos(picked);
              }}
              onRemove={(key) => {
                setServerError(null);
                photos.removePhoto(key);
              }}
              disabled={isSaving}
              unavailableMessage={photoActions ? undefined : photoUnavailableMessage}
            />
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          {serverError && <FieldError>{serverError}</FieldError>}
          {savedWithPhotoError && (
            <Button
              variant="link"
              className="self-start"
              disabled={isSaving || photos.isPreparing}
              onClick={() => {
                guard.allowLeave();
                router.replace(`/workouts/${savedWithPhotoError}`);
              }}
            >
              사진은 두고 기록 보기
            </Button>
          )}
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => goToStep(stepIndex - 1)}
                disabled={isSaving}
              >
                이전
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="flex-[2]"
              disabled={isSaving || (isLastStep && photos.isPreparing)}
            >
              {isLastStep ? (isSaving ? "저장 중…" : photos.isPreparing ? "사진 줄이는 중…" : "기록 저장") : "다음"}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmSheet
        open={guard.isLeavePending}
        title="작성을 그만둘까요?"
        description="지금 나가면 적은 내용이 사라져요."
        confirmLabel="나가기"
        cancelLabel="계속 쓰기"
        destructive
        onConfirm={guard.confirmLeave}
        onCancel={guard.cancelLeave}
      />
      {deleteWorkout && (
        <ConfirmSheet
          open={isDeleteOpen}
          title="이 기록을 지울까요?"
          description="지운 기록과 댓글은 되돌릴 수 없어요."
          confirmLabel="삭제"
          pendingLabel="삭제 중…"
          isPending={isDeleting}
          error={deleteError}
          destructive
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </main>
  );
}
