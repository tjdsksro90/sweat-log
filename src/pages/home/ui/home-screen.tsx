import type { WeeklySummary } from "@/entities/workout/model/contracts";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { WeeklySummaryCard } from "./weekly-summary-card";

export function HomeScreen({ nickname, summary }: { nickname: string; summary: WeeklySummary }) {
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
    </PageLayout>
  );
}
