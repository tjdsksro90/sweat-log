import type { WeeklySummary } from "@/entities/workout/model/contracts";
import { formatDistance } from "@/entities/workout/model/pace";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Stat } from "@/shared/ui/stat";

import { buildWeekDays } from "../model/week";

export function WeeklySummaryCard({ summary }: { summary: WeeklySummary }) {
  const days = buildWeekDays(summary);
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-title">이번 주 땀</h2>
        <p className="text-caption text-muted-foreground">
          {days[0].date} ~ {days[6].date}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Stat label="달린 거리" value={formatDistance(summary.runDistanceMeters)} />
        <div className="grid grid-cols-2 gap-4">
          <Stat label="운동 횟수" value={summary.workoutCount} unit="회" size="sm" />
          <Stat label="연속 운동" value={summary.streakDays} unit="일" size="sm" />
        </div>
        <ul className="grid grid-cols-7 gap-1" aria-label="이번 주 운동한 날">
          {days.map((day) => (
            <li
              key={day.date}
              className="flex min-w-0 flex-col items-center gap-2 text-caption"
              aria-label={`${day.date} ${day.label}요일, ${day.active ? "운동함" : "기록 없음"}`}
            >
              <span aria-hidden="true" className="text-muted-foreground">
                {day.label}
              </span>
              <span
                aria-hidden="true"
                className={`flex size-8 items-center justify-center rounded-full ${day.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {day.active ? "✓" : "·"}
              </span>
            </li>
          ))}
        </ul>
        {summary.workoutCount === 0 && (
          <p className="text-caption text-muted-foreground">이번 주 첫 움직임을 남겨 보세요. 가벼운 산책도 좋아요.</p>
        )}
      </CardContent>
    </Card>
  );
}
