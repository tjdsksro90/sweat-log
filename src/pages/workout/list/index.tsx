import { PageLayout } from "@/shared/ui/layouts/page-layout";

export function WorkoutListPage() {
  return (
    <PageLayout title="기록">
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
        아직 기록이 없어요. 오늘의 러닝이나 헬스를 남겨 보세요.
      </p>
    </PageLayout>
  );
}
