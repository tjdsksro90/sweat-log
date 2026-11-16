import { getMyProfile } from "@/entities/profile/api/get-my-profile";
import { getWeeklySummary } from "@/entities/workout/api/server-queries";

import { HomeScreen } from "./ui/home-screen";

export async function HomePage() {
  const [profile, summary] = await Promise.all([getMyProfile(), getWeeklySummary()]);
  return <HomeScreen nickname={profile.nickname} summary={summary} />;
}
