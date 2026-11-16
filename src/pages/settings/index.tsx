import { getMyProfile } from "@/entities/profile/api/get-my-profile";
import { logout } from "@/features/auth";

import { SettingsScreen } from "./ui/settings-screen";

export async function SettingsPage() {
  const profile = await getMyProfile();
  return <SettingsScreen nickname={profile.nickname} logoutAction={logout} />;
}
