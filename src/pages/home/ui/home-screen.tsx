import type { StrengthRecord } from "@/entities/exercise/model/strength-records";
import type { WeeklySummary } from "@/entities/workout/model/contracts";
import type { RunningStats } from "@/entities/workout/model/running-stats";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { RunningStatsCard } from "./running-stats-card";
import { StrengthRecordsCard } from "./strength-records-card";
import { WeeklySummaryCard } from "./weekly-summary-card";

export function HomeScreen({
  nickname,
  summary,
  runningStats,
  strengthRecords,
}: {
  nickname: string;
  summary: WeeklySummary;
  runningStats: RunningStats;
  strengthRecords: StrengthRecord[];
}) {
  return (
    <PageLayout
      title="홈"
      action={
        <Button render={<AppLink href="/workouts/new" />} nativeButton={false} role="link">
          기록하기
        </Button>
      }
    >
      <section className="flex flex-col gap-1">
        <p className="text-muted-foreground">안녕하세요,</p>
        <p className="break-words font-bold text-3xl text-foreground">{nickname}님.</p>
      </section>
      <WeeklySummaryCard summary={summary} />
      <RunningStatsCard stats={runningStats} />
      <StrengthRecordsCard records={strengthRecords} />
    </PageLayout>
  );
}
