import { getMyProfile } from "@/entities/profile/api/get-my-profile";
import { logout } from "@/features/auth";
import {
  deletePushSubscription,
  isMyPushSubscription,
  savePushSubscription,
} from "@/features/push-notification/api/subscription-actions";

import { SettingsScreen } from "./ui/settings-screen";

export async function SettingsPage() {
  const profile = await getMyProfile();
  return (
    <SettingsScreen
      nickname={profile.nickname}
      logoutAction={logout}
      push={{
        deleteSubscription: deletePushSubscription,
        isMySubscription: isMyPushSubscription,
        saveSubscription: savePushSubscription,
      }}
    />
  );
}
