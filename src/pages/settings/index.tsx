import { getMyProfile } from "@/entities/profile/api/get-my-profile";
import { LogoutButton } from "@/features/auth";
import { Card, CardContent } from "@/shared/ui/card";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

export async function SettingsPage() {
  const profile = await getMyProfile();

  return (
    <PageLayout title="설정">
      <Card>
        <CardContent>
          <p className="text-muted-foreground text-sm">닉네임</p>
          <p className="mt-1 break-words font-semibold text-title">{profile.nickname}</p>
        </CardContent>
      </Card>
      <LogoutButton />
    </PageLayout>
  );
}
