import type { ReactNode } from "react";

import type { WorkoutDetail } from "@/entities/workout/model/contracts";
import { WORKOUT_KIND_LABELS } from "@/entities/workout/model/types";
import { WorkoutMetrics } from "@/entities/workout/ui/workout-card";
import { WorkoutPhotoGallery } from "@/entities/workout/ui/workout-photo-gallery";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Chip } from "@/shared/ui/chip";

export function WorkoutDetailView({ workout, comments }: { workout: WorkoutDetail; comments?: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <Button
        className="self-start"
        variant="ghost"
        render={<AppLink href="/workouts" />}
        nativeButton={false}
        role="link"
      >
        ← 기록 목록
      </Button>
      <Card>
        <CardHeader>
          <div>
            <Chip kind={workout.kind} />
          </div>
          <h2 className="mt-2 break-words font-semibold text-title">
            {workout.title || `${WORKOUT_KIND_LABELS[workout.kind]} 기록`}
          </h2>
          <time className="text-caption text-muted-foreground" dateTime={workout.workoutDate}>
            {workout.workoutDate}
          </time>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <WorkoutMetrics workout={{ ...workout, strengthSummary: null }} />
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 break-words text-caption">
            <dt className="text-muted-foreground">작성자</dt>
            <dd>{workout.author.nickname}</dd>
            <dt className="text-muted-foreground">장소</dt>
            <dd>{workout.placeName || "미입력"}</dd>
            <dt className="text-muted-foreground">함께한 친구</dt>
            <dd>{workout.companions.map((person) => person.nickname).join(", ") || "없음"}</dd>
            <dt className="text-muted-foreground">공유 크루</dt>
            <dd>{workout.crew?.name || "없음"}</dd>
          </dl>
        </CardContent>
      </Card>
      <WorkoutPhotoGallery
        photos={workout.photos}
        label={workout.title || `${WORKOUT_KIND_LABELS[workout.kind]} 기록`}
      />
      {workout.kind === "strength" &&
        workout.exercises.map((exercise, exerciseIndex) => (
          <Card key={`${exerciseIndex}-${exercise.name}`}>
            <CardContent>
              <table className="w-full table-fixed text-caption tabular-nums">
                <caption className="mb-3 break-words text-left font-semibold text-title">{exercise.name}</caption>
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th scope="col" className="py-3 text-left">
                      세트
                    </th>
                    <th scope="col" className="py-3 text-right">
                      무게
                    </th>
                    <th scope="col" className="py-3 text-right">
                      횟수
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exercise.sets.map((set, setIndex) => (
                    <tr key={`${exerciseIndex}-set-${setIndex + 1}`} className="border-b last:border-0">
                      <th scope="row" className="py-3 text-left font-normal">
                        {setIndex + 1}
                      </th>
                      <td className="py-3 text-right">{set.weightKg === null ? "맨몸" : `${set.weightKg} kg`}</td>
                      <td className="py-3 text-right">{set.reps}회</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      <section aria-labelledby="memo-heading" className="flex flex-col gap-2">
        <h2 id="memo-heading" className="font-semibold text-title">
          오늘의 메모
        </h2>
        <p className="whitespace-pre-wrap break-words text-body">{workout.memo || "남긴 메모가 없어요."}</p>
      </section>
      {(workout.isMine || workout.exercises.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {/* 삭제는 수정 화면에서 확인 시트와 함께 한다. */}
          {workout.isMine && (
            <Button
              variant="outline"
              render={<AppLink href={`/workouts/${workout.id}/edit`} />}
              nativeButton={false}
              role="link"
            >
              수정
            </Button>
          )}
          {/* 볼 수 있는 헬스 기록이면 친구 기록의 구성도 내 루틴으로 저장할 수 있다. 값을 복사해 둘은 따로 산다. */}
          {workout.exercises.length > 0 && (
            <Button
              variant="outline"
              render={<AppLink href={`/settings/routines/new?from=${workout.id}`} />}
              nativeButton={false}
              role="link"
            >
              이 구성으로 루틴 만들기
            </Button>
          )}
        </div>
      )}
      {comments}
    </div>
  );
}
