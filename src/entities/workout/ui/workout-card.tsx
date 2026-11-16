import type { WorkoutListItem } from "@/entities/workout/model/contracts";
import { formatDistance, formatDuration, formatPace, getPaceSecondsPerKm } from "@/entities/workout/model/pace";
import { WORKOUT_KIND_LABELS } from "@/entities/workout/model/types";
import { AppLink } from "@/shared/lib/app-navigation";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Chip } from "@/shared/ui/chip";
import { Stat } from "@/shared/ui/stat";

export function WorkoutCard({ workout }: { workout: WorkoutListItem }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Chip kind={workout.kind} />
          <time className="text-caption text-muted-foreground" dateTime={workout.workoutDate}>
            {workout.workoutDate}
          </time>
        </div>
        <h3 className="break-words font-semibold text-title">
          <AppLink
            className="inline-flex min-h-11 items-center rounded-md underline-offset-4 hover:underline focus-visible:outline-2"
            href={`/workouts/${workout.id}`}
          >
            {workout.title || `${WORKOUT_KIND_LABELS[workout.kind]} 기록`}
          </AppLink>
        </h3>
        <p className="break-words text-caption text-muted-foreground">
          {workout.author.nickname} · {workout.placeName || "장소 미입력"}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <WorkoutMetrics workout={workout} />
        <div className="flex flex-col gap-1 break-words text-caption text-muted-foreground">
          {workout.companions.length > 0 && (
            <p>함께한 친구 · {workout.companions.map((person) => person.nickname).join(", ")}</p>
          )}
          <p>{workout.crew ? `공유 크루 · ${workout.crew.name}` : "공유 크루 없음"}</p>
          <p>댓글 {workout.commentCount}개</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkoutMetrics({
  workout,
}: {
  workout: Pick<WorkoutListItem, "kind" | "run" | "strengthSummary" | "durationSeconds">;
}) {
  if (workout.kind === "run" && workout.run) {
    const { distanceMeters, durationSeconds } = workout.run;
    return (
      <div className="grid grid-cols-2 gap-4">
        <Stat label="거리" value={formatDistance(distanceMeters)} size="sm" />
        <Stat label="시간" value={formatDuration(durationSeconds)} size="sm" />
        <Stat
          label="페이스"
          value={formatPace(getPaceSecondsPerKm(distanceMeters, durationSeconds))}
          unit="/km"
          size="sm"
        />
      </div>
    );
  }
  if (workout.kind === "strength" && workout.strengthSummary) {
    const summary = workout.strengthSummary;
    return (
      <div className="grid grid-cols-2 gap-4">
        <Stat label="종목" value={summary.exerciseCount} unit="개" size="sm" />
        <Stat label="세트" value={summary.setCount} unit="세트" size="sm" />
        <Stat
          className="col-span-2"
          label="총 볼륨"
          value={summary.totalVolumeKg.toLocaleString("ko-KR")}
          unit="kg"
          size="sm"
        />
      </div>
    );
  }
  return (
    <Stat
      label="운동 시간"
      value={workout.durationSeconds === null ? "미입력" : formatDuration(workout.durationSeconds)}
      size="sm"
    />
  );
}
