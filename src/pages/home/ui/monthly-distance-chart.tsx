import { formatDistance } from "@/entities/workout/model/pace";
import type { RunningMonth } from "@/entities/workout/model/running-stats";

import { formatMonthLong, formatMonthShort, toBarPercent } from "../model/running-stats-view";

/**
 * 월별 누적 거리 막대. 계열이 하나라 범례 없이 제목이 이름을 맡고, 값은 이번 달과 가장 많이 달린 달만 글로 보여 준다.
 * 막대 하나가 44px보다 좁아 누르는 툴팁 대신 항목마다 aria-label로 값을 읽어 준다.
 * 디자인 시스템으로 옮길 후보(단일 계열 막대 그래프).
 */
export function MonthlyDistanceChart({ months }: { months: RunningMonth[] }) {
  const maxMeters = Math.max(0, ...months.map((month) => month.distanceMeters));
  return (
    <ol
      className="grid h-32 items-end gap-0.5"
      style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
      aria-label={`최근 ${months.length}개월 달린 거리`}
    >
      {months.map((month) => {
        const percent = toBarPercent(month.distanceMeters, maxMeters);
        return (
          <li
            key={month.month}
            className="flex h-full min-w-0 flex-col items-center justify-end gap-1"
            aria-label={`${formatMonthLong(month.month)} ${formatDistance(month.distanceMeters)}, ${month.runCount}회`}
          >
            <span aria-hidden="true" className="flex w-full flex-1 items-end justify-center">
              <span
                className={`w-full max-w-4 rounded-t-[4px] ${percent > 0 ? "bg-workout-run" : "h-0.5 bg-border"}`}
                style={percent > 0 ? { height: `${percent}%` } : undefined}
              />
            </span>
            <span aria-hidden="true" className="text-caption text-muted-foreground tabular-nums leading-none">
              {formatMonthShort(month.month).replace("월", "")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
