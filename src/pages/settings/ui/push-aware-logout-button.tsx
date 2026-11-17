"use client";

import { LogoutButton } from "@/features/auth/ui/logout-button";
import { forgetBrowserPush } from "@/features/push-notification/lib/browser-push";
import type { PushSettingsActions } from "@/features/push-notification/ui/push-settings";

// 로그아웃 전에 이 브라우저의 알림 구독을 끊어, 다음 사용자가 이전 계정의 알림을 받지 않게 한다.
export function PushAwareLogoutButton({
  logoutAction,
  deleteSubscription,
}: {
  logoutAction: (formData: FormData) => void | Promise<void>;
  deleteSubscription: PushSettingsActions["deleteSubscription"];
}) {
  return (
    <LogoutButton
      action={async (formData) => {
        await forgetBrowserPush(deleteSubscription);
        await logoutAction(formData);
      }}
    />
  );
}
