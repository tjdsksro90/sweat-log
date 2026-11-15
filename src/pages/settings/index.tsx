import { getMyProfile } from "@/entities/profile/api/get-my-profile";
import { LogoutButton } from "@/features/auth";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

export async function SettingsPage() {
  const profile = await getMyProfile();

  return (
    <PageLayout title="설정">
      <section className="rounded-xl border bg-card p-5">
        <p className="text-muted-foreground text-sm">닉네임</p>
        <p className="mt-1 font-semibold text-lg">{profile.nickname}</p>
      </section>
      <LogoutButton />
    </PageLayout>
  );
}
