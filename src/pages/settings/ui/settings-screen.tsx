import { LogoutButton } from "@/features/auth/ui/logout-button";
import { Card, CardContent } from "@/shared/ui/card";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

export function SettingsScreen({
  nickname,
  logoutAction,
}: {
  nickname: string;
  logoutAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <PageLayout title="설정">
      <Card>
        <CardContent>
          <p className="text-muted-foreground text-sm">닉네임</p>
          <p className="mt-1 break-words font-semibold text-title">{nickname}</p>
        </CardContent>
      </Card>
      <LogoutButton action={logoutAction} />
    </PageLayout>
  );
}
