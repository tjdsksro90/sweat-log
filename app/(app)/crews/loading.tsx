import { PageLayout } from "@/shared/ui/layouts/page-layout";

export default function CrewLoading() {
  return (
    <PageLayout title="크루">
      <p role="status" className="text-muted-foreground">
        크루를 불러오는 중…
      </p>
    </PageLayout>
  );
}
