import { getStrengthRecords } from "@/entities/exercise/api/get-strength-records";
import { getMyProfile } from "@/entities/profile/api/get-my-profile";
import { getRunningStats, getWeeklySummary } from "@/entities/workout/api/server-queries";
import { getKstToday } from "@/entities/workout/model/weekly-summary";

import { HomeScreen } from "./ui/home-screen";

export async function HomePage() {
  const today = getKstToday();
  const [profile, summary, runningStats, strengthRecords] = await Promise.all([
    getMyProfile(),
    getWeeklySummary(today),
    getRunningStats(today),
    getStrengthRecords(today),
  ]);
  return (
    <HomeScreen
      nickname={profile.nickname}
      summary={summary}
      runningStats={runningStats}
      strengthRecords={strengthRecords}
    />
  );
}
