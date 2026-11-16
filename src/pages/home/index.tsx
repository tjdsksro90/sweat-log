import { getMyProfile } from "@/entities/profile/api/get-my-profile";
import { getRunningStats, getWeeklySummary } from "@/entities/workout/api/server-queries";

import { HomeScreen } from "./ui/home-screen";

export async function HomePage() {
  const [profile, summary, runningStats] = await Promise.all([getMyProfile(), getWeeklySummary(), getRunningStats()]);
  return <HomeScreen nickname={profile.nickname} summary={summary} runningStats={runningStats} />;
}
