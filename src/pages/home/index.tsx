import { getMyProfile } from "@/entities/profile/api/get-my-profile";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

export async function HomePage() {
  const profile = await getMyProfile();

  return (
    <PageLayout title="홈">
      <section className="flex flex-col gap-1">
        <p className="text-muted-foreground">안녕하세요,</p>
        <p className="font-bold text-3xl">
          {profile.nickname}님<span className="text-primary">.</span>
        </p>
      </section>
      <section className="rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="font-semibold">이번 주 땀</h2>
        <p className="mt-2 text-muted-foreground text-sm">기록을 남기면 이번 주 거리와 운동 횟수가 여기에 쌓여요.</p>
      </section>
    </PageLayout>
  );
}
