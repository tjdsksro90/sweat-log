import { SneakerIcon } from "@phosphor-icons/react/ssr";

import { formatDistance } from "@/entities/workout/model/pace";
import { hasRuns, type RunningStats } from "@/entities/workout/model/running-stats";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Stat } from "@/shared/ui/stat";

import { formatMonthLong, getBusiestMonth, toRunningRecordRows } from "../model/running-stats-view";
import { MonthlyDistanceChart } from "./monthly-distance-chart";

export function RunningStatsCard({ stats }: { stats: RunningStats }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-title">러닝 기록</h2>
        <p className="text-caption text-muted-foreground">내가 쓰거나 함께 뛴 러닝을 모았어요.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {hasRuns(stats) ? <RunningStatsContent stats={stats} /> : <RunningStatsEmpty hasWorkouts={stats.hasWorkouts} />}
      </CardContent>
    </Card>
  );
}

function RunningStatsEmpty({ hasWorkouts }: { hasWorkouts: boolean }) {
  return (
    <EmptyState
      className="py-4"
      icon={<SneakerIcon size={28} />}
      headingLevel={3}
      title={hasWorkouts ? "아직 러닝 기록이 없어요" : "첫 러닝을 남겨 볼까요?"}
      description={
        hasWorkouts
          ? "러닝을 한 번 기록하면 월별 거리와 개인 기록을 모아 보여 드려요."
          : "짧게 달려도 좋아요. 기록이 쌓이면 월별 거리와 개인 기록이 여기에 보여요."
      }
      action={
        <Button variant="outline" render={<AppLink href="/workouts/new?kind=run" />} nativeButton={false} role="link">
          러닝 기록하기
        </Button>
      }
    />
  );
}

function RunningStatsContent({ stats }: { stats: RunningStats }) {
  const thisMonth = stats.months.at(-1);
  const busiest = getBusiestMonth(stats.months);
  return (
    <>
      <div className="flex flex-col gap-4">
        <Stat label="이번 달 달린 거리" value={formatDistance(thisMonth?.distanceMeters ?? 0)} />
        <MonthlyDistanceChart months={stats.months} />
        <p className="text-caption text-muted-foreground">
          {busiest
            ? `최근 ${stats.months.length}개월 중 가장 많이 달린 달은 ${formatMonthLong(busiest.month)}, ${formatDistance(busiest.distanceMeters)}예요.`
            : `최근 ${stats.months.length}개월에는 러닝 기록이 없어요.`}
        </p>
      </div>
      <section className="flex flex-col gap-2" aria-labelledby="running-records-title">
        <h3 id="running-records-title" className="font-semibold text-body">
          개인 기록
        </h3>
        <ul className="flex flex-col divide-y divide-border">
          {toRunningRecordRows(stats.records).map((row) => {
            const body = (
              <>
                <span className="flex min-w-0 flex-col">
                  <span className="text-caption text-muted-foreground">{row.label}</span>
                  <span className="break-words text-caption text-muted-foreground">{row.detail}</span>
                </span>
                <span className="shrink-0 font-bold text-xl tabular-nums">
                  {row.value}
                  {row.unit && row.value !== "-" && (
                    <span className="ml-1 font-normal text-caption text-muted-foreground">{row.unit}</span>
                  )}
                </span>
              </>
            );
            return (
              <li key={row.type}>
                {row.href ? (
                  <AppLink
                    href={row.href}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-md py-2 focus-visible:outline-2"
                  >
                    {body}
                  </AppLink>
                ) : (
                  <div className="flex min-h-14 items-center justify-between gap-3 py-2">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
