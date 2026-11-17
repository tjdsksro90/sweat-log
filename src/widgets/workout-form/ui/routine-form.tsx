"use client";

import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";

import { TrashIcon, XIcon } from "@phosphor-icons/react";

import { ROUTINE_LIMITS } from "@/entities/routine/model/routine";
import {
  isRoutineFormDirty,
  type RoutineFormValues,
  toRoutineInput,
  validateRoutineForm,
} from "@/features/workout/model/routine-form";
import { useAppRouter } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

import type { DeleteRoutineAction, SaveRoutineAction } from "../model/types";
import { useLeaveGuard } from "../model/use-leave-guard";
import { ConfirmSheet } from "./confirm-sheet";
import { FormField } from "./form-field";
import { StrengthDetail } from "./strength-detail";

const ROUTINES_PATH = "/settings/routines";

/**
 * 루틴 만들기·수정. 종목·세트 입력은 기록 작성 폼의 헬스 상세(StrengthDetail)를 그대로 쓴다.
 * 저장·삭제는 prop으로 받은 Server Action이 맡는다. 체험 데모는 sessionStorage 저장소를 넘긴다.
 */
export function RoutineForm({
  title,
  initialValues,
  saveRoutine,
  deleteRoutine,
}: {
  title: string;
  initialValues: RoutineFormValues;
  saveRoutine: SaveRoutineAction;
  deleteRoutine?: DeleteRoutineAction; // 수정 화면에만
}) {
  const router = useAppRouter();
  const [values, setValues] = useState(initialValues);
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  const [focusRequest, setFocusRequest] = useState<object | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const guard = useLeaveGuard(isRoutineFormDirty(initialValues, values));
  const errors = showErrors ? validateRoutineForm(values) : {};

  // 저장을 눌러 오류가 생기면 첫 오류 입력으로 포커스를 옮긴다.
  useEffect(() => {
    if (focusRequest) bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusRequest]);

  const update = (change: (current: RoutineFormValues) => RoutineFormValues) => {
    setServerError(null);
    setValues(change);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    const result = toRoutineInput(values);
    if (!result.ok) {
      setShowErrors(true);
      setFocusRequest({});
      return;
    }

    startSaving(async () => {
      const saved = await saveRoutine(result.input);
      if (!saved.ok) {
        setServerError(saved.error);
        return;
      }
      guard.allowLeave();
      router.replace(ROUTINES_PATH);
    });
  };

  const handleDelete = () => {
    if (!deleteRoutine || !initialValues.id) return;
    const id = initialValues.id;

    startDeleting(async () => {
      const deleted = await deleteRoutine(id);
      if (!deleted.ok) {
        setDeleteError(deleted.error);
        return;
      }
      guard.allowLeave();
      router.replace(ROUTINES_PATH);
    });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-page pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+7rem)]">
      <header className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="닫기"
          onClick={() => guard.requestLeave(() => router.push(ROUTINES_PATH))}
          className="-ml-3"
        >
          <XIcon size={24} />
        </Button>
        <h1 className="min-w-0 flex-1 break-words font-bold text-title">{title}</h1>
        {deleteRoutine && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="루틴 삭제"
            onClick={() => {
              setDeleteError(null);
              setIsDeleteOpen(true);
            }}
          >
            <TrashIcon size={22} />
          </Button>
        )}
      </header>

      <form noValidate onSubmit={handleSubmit} aria-label={title} className="flex flex-1 flex-col gap-section">
        <div ref={bodyRef} className="flex flex-col gap-6">
          <FormField
            id="routine-name"
            label="루틴 이름"
            description={`${ROUTINE_LIMITS.name}자까지 적을 수 있어요.`}
            error={errors.name}
          >
            {(control) => (
              <Input
                {...control}
                value={values.name}
                onChange={(event) => update((current) => ({ ...current, name: event.target.value }))}
                placeholder="하체 데이"
                autoComplete="off"
              />
            )}
          </FormField>
          <section aria-labelledby="routine-exercises-title" className="flex flex-col gap-4">
            <h2 id="routine-exercises-title" className="font-semibold text-title">
              종목과 세트
            </h2>
            <StrengthDetail
              exercises={values.exercises}
              errors={errors}
              onChange={(change) => update((current) => ({ ...current, exercises: change(current.exercises) }))}
            />
          </section>
          <p className="text-caption text-muted-foreground">루틴을 고치거나 지워도 이미 저장한 기록은 바뀌지 않아요.</p>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          {serverError && <FieldError>{serverError}</FieldError>}
          <Button type="submit" variant="primary" size="lg" disabled={isSaving}>
            {isSaving ? "저장 중…" : "루틴 저장"}
          </Button>
        </div>
      </form>

      <ConfirmSheet
        open={guard.isLeavePending}
        title="편집을 그만둘까요?"
        description="지금 나가면 고친 내용이 사라져요."
        confirmLabel="나가기"
        cancelLabel="계속 고치기"
        destructive
        onConfirm={guard.confirmLeave}
        onCancel={guard.cancelLeave}
      />
      {deleteRoutine && (
        <ConfirmSheet
          open={isDeleteOpen}
          title="이 루틴을 지울까요?"
          description="지운 루틴은 되돌릴 수 없어요. 이 루틴으로 저장한 기록은 그대로 남아요."
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
