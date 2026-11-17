import { ClipboardTextIcon } from "@phosphor-icons/react/ssr";

import { LogoutButton } from "@/features/auth/ui/logout-button";
import { PushSettings, type PushSettingsActions } from "@/features/push-notification/ui/push-settings";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { PushAwareLogoutButton } from "./push-aware-logout-button";
import { ThemeSettings } from "./theme-settings";

export function SettingsScreen({
  nickname,
  logoutAction,
  push,
}: {
  nickname: string;
  logoutAction: (formData: FormData) => void | Promise<void>;
  // 체험 데모는 넘기지 않는다. 알림 설정이 숨고 로그아웃도 구독을 건드리지 않는다.
  push?: PushSettingsActions;
}) {
  return (
    <PageLayout title="설정">
      <Card>
        <CardContent>
          <p className="text-muted-foreground text-sm">닉네임</p>
          <p className="mt-1 break-words font-semibold text-title">{nickname}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="font-semibold text-title">내 루틴</h2>
          <p className="text-body text-muted-foreground">자주 하는 헬스 구성을 저장해 두고 기록할 때 불러와요.</p>
          <Button role="link" variant="outline" render={<AppLink href="/settings/routines" />} nativeButton={false}>
            <ClipboardTextIcon />
            루틴 관리
          </Button>
        </CardContent>
      </Card>
      <ThemeSettings />
      {push && <PushSettings actions={push} />}
      {push ? (
        <PushAwareLogoutButton logoutAction={logoutAction} deleteSubscription={push.deleteSubscription} />
      ) : (
        <LogoutButton action={logoutAction} />
      )}
    </PageLayout>
  );
}
