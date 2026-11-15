import { PageLayout } from "@/shared/ui/layouts/page-layout";

export function CrewListPage() {
  return (
    <PageLayout title="크루">
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
        크루를 만들거나 초대 코드로 들어가면 친구들의 기록을 함께 볼 수 있어요.
      </p>
    </PageLayout>
  );
}
