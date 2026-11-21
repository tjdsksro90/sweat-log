"use client";

import { useRef, useState } from "react";

import { ArrowLeftIcon, BarbellIcon, PlusIcon } from "@phosphor-icons/react";

import {
  type DeleteUserExerciseResult,
  findRecordOnlyExercises,
  type RecordedExerciseName,
  type SaveUserExerciseResult,
  USER_EXERCISE_LIMITS,
  type UserExercise,
  type UserExerciseInput,
} from "@/entities/exercise/model/user-exercise";
import { ExerciseEditorSheet } from "@/entities/exercise/ui/exercise-editor-sheet";
import { useRefreshUserExercises } from "@/entities/exercise/ui/user-exercises-provider";
import { AppLink } from "@/shared/lib/app-navigation";
import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/shared/ui/bottom-sheet";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

type Editing =
  | { mode: "create"; initial: UserExerciseInput; fromRecord: boolean }
  | { mode: "edit"; initial: UserExerciseInput };

const RENAME_NOTICE = "이름을 바꿔도 지난 기록의 이름은 그대로예요. 이름이 달라지면 최고 무게도 따로 모여요.";

/**
 * 설정 > 내 종목. 실제 앱은 서버에서 읽은 목록과 Server Action을, 체험 데모는 체험 저장소의 것을 넘긴다.
 * 고치거나 지운 뒤 실제 앱은 Server Action의 revalidatePath가, 체험은 조회를 다시 실행해 목록을 새로 그린다.
 */
export function ExerciseListScreen({
  exercises,
  recordedNames,
  saveExercise,
  deleteExercise,
}: {
  exercises: UserExercise[];
  recordedNames: RecordedExerciseName[];
  saveExercise: (input: UserExerciseInput) => Promise<SaveUserExerciseResult>;
  deleteExercise: (id: string) => Promise<DeleteUserExerciseResult>;
}) {
  const refreshSuggestions = useRefreshUserExercises();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<UserExercise | null>(null);
  const [message, setMessage] = useState("");
  const isFull = exercises.length >= USER_EXERCISE_LIMITS.perUser;
  const recordOnly = findRecordOnlyExercises(recordedNames, exercises);

  const startCreate = (name = "", fromRecord = false) =>
    setEditing({ fromRecord, initial: { bodyPart: null, bodyweight: false, name }, mode: "create" });

  return (
    <PageLayout
      title="내 종목"
      action={
        isFull ? undefined : (
          <Button variant="primary" onClick={() => startCreate()}>
            <PlusIcon />새 종목
          </Button>
        )
      }
    >
      <Button
        className="self-start"
        variant="ghost"
        render={<AppLink href="/settings" />}
        nativeButton={false}
        role="link"
      >
        <ArrowLeftIcon />
        설정
      </Button>
      <p className="text-body text-muted-foreground">
        기본 종목에 없는 운동을 부위와 함께 등록해 두면, 기록할 때 종목 이름 추천에 떠요.
      </p>
      <p role="status" className="text-caption text-muted-foreground empty:sr-only">
        {message}
      </p>

      {exercises.length === 0 ? (
        <EmptyState
          icon={<BarbellIcon size={28} />}
          headingLevel={2}
          title="아직 내 종목이 없어요"
          description="새 종목을 만들거나, 기록할 때 종목 이름 추천의 ‘새 종목으로 추가’를 눌러 보세요."
        />
      ) : (
        <section aria-labelledby="my-exercise-list-title" className="flex flex-col gap-3">
          <h2 id="my-exercise-list-title" className="font-semibold text-title">
            등록한 종목 <span className="text-muted-foreground">{exercises.length}개</span>
          </h2>
          <ul className="flex flex-col gap-3">
            {exercises.map((exercise) => (
              <li key={exercise.id}>
                <Card size="sm">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <h3 className="break-words font-semibold text-body">{exercise.name}</h3>
                      <p className="text-caption text-muted-foreground">
                        {exercise.bodyPart}
                        {exercise.bodyweight ? " · 맨몸" : ""}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        aria-label={`${exercise.name} 고치기`}
                        onClick={() => setEditing({ initial: exercise, mode: "edit" })}
                      >
                        고치기
                      </Button>
                      <Button
                        variant="destructive"
                        aria-label={`${exercise.name} 지우기`}
                        onClick={() => setDeleting(exercise)}
                      >
                        지우기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {isFull && (
            <p className="text-caption text-muted-foreground">
              내 종목은 {USER_EXERCISE_LIMITS.perUser}개까지 등록할 수 있어요. 새로 만들려면 안 쓰는 종목을 지워 주세요.
            </p>
          )}
        </section>
      )}

      {recordOnly.length > 0 && (
        <section aria-labelledby="record-only-title" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="record-only-title" className="font-semibold text-title">
              기록에만 있는 종목
            </h2>
            <p className="text-caption text-muted-foreground">
              헬스 기록에 직접 적은 이름이에요. 부위를 골라 등록하면 다음부터 추천에 떠요.
            </p>
          </div>
          <ul className="flex flex-col divide-y rounded-xl border bg-surface">
            {recordOnly.map((item) => (
              <li key={item.name} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="break-words text-body">{item.name}</span>
                  <span className="text-caption text-muted-foreground">기록 {item.workoutCount}번</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFull}
                  aria-label={`${item.name} 내 종목으로 등록`}
                  onClick={() => startCreate(item.name, true)}
                >
                  등록
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ExerciseEditorSheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={editing?.mode === "edit" ? "종목 고치기" : "새 종목"}
        description={
          editing?.mode === "edit"
            ? "이름, 부위, 맨몸 여부를 고칠 수 있어요."
            : editing?.fromRecord
              ? "부위를 고르면 내 종목으로 등록돼요."
              : "부위를 골라 내 종목으로 등록하면 기록할 때 추천에 떠요."
        }
        submitLabel={editing?.mode === "edit" ? "저장" : "등록"}
        initial={editing?.initial ?? { bodyPart: null, bodyweight: false, name: "" }}
        existing={exercises}
        notice={editing?.mode === "edit" ? RENAME_NOTICE : undefined}
        onSave={saveExercise}
        onSaved={(exercise) => {
          setMessage(
            editing?.mode === "edit" ? `‘${exercise.name}’을(를) 고쳤어요.` : `‘${exercise.name}’을(를) 등록했어요.`,
          );
          void refreshSuggestions();
        }}
      />
      <DeleteExerciseSheet
        exercise={deleting}
        onClose={() => setDeleting(null)}
        deleteExercise={deleteExercise}
        onDeleted={(exercise) => {
          setMessage(`‘${exercise.name}’을(를) 지웠어요.`);
          void refreshSuggestions();
        }}
      />
    </PageLayout>
  );
}

function DeleteExerciseSheet({
  exercise,
  onClose,
  deleteExercise,
  onDeleted,
}: {
  exercise: UserExercise | null;
  onClose: () => void;
  deleteExercise: (id: string) => Promise<DeleteUserExerciseResult>;
  onDeleted: (exercise: UserExercise) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 닫히는 동안에도 제목이 비지 않도록 마지막으로 연 종목을 기억한다.
  const shown = useRef(exercise);
  if (exercise) shown.current = exercise;

  const confirm = async () => {
    if (!exercise || pending) return;
    setPending(true);
    try {
      const result = await deleteExercise(exercise.id);
      if (result.ok) {
        onDeleted(exercise);
        onClose();
      } else setError(result.error);
    } catch {
      setError("종목을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  };

  return (
    <BottomSheet
      open={exercise !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
    >
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>‘{shown.current?.name}’을(를) 지울까요?</BottomSheetTitle>
          <BottomSheetDescription>
            추천에서만 빠지고, 이 이름으로 쓴 지난 기록과 최고 무게는 그대로 남아요.
          </BottomSheetDescription>
        </BottomSheetHeader>
        <p role="alert" className="px-5 text-caption text-destructive empty:hidden">
          {error}
        </p>
        <BottomSheetFooter>
          <Button variant="destructive" size="lg" onClick={() => void confirm()} disabled={pending}>
            {pending ? "지우는 중…" : "지우기"}
          </Button>
          <BottomSheetClose render={<Button variant="secondary" size="lg" />}>취소</BottomSheetClose>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
