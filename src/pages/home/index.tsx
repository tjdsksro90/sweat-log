import { getMyProfile } from "@/entities/profile/api/get-my-profile";
import { getWeeklySummary } from "@/entities/workout/api/server-queries";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { WeeklySummaryCard } from "./ui/weekly-summary-card";

export async function HomePage() {
  const [profile, summary] = await Promise.all([getMyProfile(), getWeeklySummary()]);

  return (
    <PageLayout title="홈">
      <section className="flex flex-col gap-1">
        <p className="text-muted-foreground">안녕하세요,</p>
        <p className="break-words font-bold text-3xl text-foreground">{profile.nickname}님.</p>
      </section>
      <WeeklySummaryCard summary={summary} />
    </PageLayout>
  );
}
