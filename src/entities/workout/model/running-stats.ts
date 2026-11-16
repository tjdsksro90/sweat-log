/**
 * 러닝 통계. 대상은 내가 작성했거나 함께한 친구로 들어간 러닝이다.
 * 실제 앱은 DB 함수(get_running_monthly_distance, get_running_records)가 집계하고 toRunningStats로 옮긴다.
 * 체험은 저장소의 행을 buildRunningStats로 같은 규칙에 따라 집계한다. 규칙을 바꾸면 두 곳을 함께 바꾼다.
 * 날짜는 한국 시간 기준 YYYY-MM-DD 문자열이고, 월은 YYYY-MM이다.
 */
export const RUNNING_STATS_MONTHS = 12;
// 짧은 질주가 최고 페이스가 되지 않도록 최고 페이스는 1km 이상만 본다.
export const BEST_PACE_MIN_METERS = 1000;

export const RUNNING_RECORD_TYPES = [
  "bestPace",
  "bestPace5k",
  "bestPace10k",
  "longestDistance",
  "longestDuration",
] as const;
export type RunningRecordType = (typeof RUNNING_RECORD_TYPES)[number];

export type RunningRecord = {
  workoutId: string;
  workoutDate: string;
  distanceMeters: number;
  durationSeconds: number;
};

export type RunningMonth = {
  month: string; // YYYY-MM
  distanceMeters: number;
  runCount: number;
};

export type RunningStats = {
  hasWorkouts: boolean; // 종류와 상관없이 내 기록이 하나라도 있는지(빈 상태 문구를 고른다)
  months: RunningMonth[]; // 오래된 달부터, 이번 달까지
  records: Record<RunningRecordType, RunningRecord | null>;
};

export type RunningStatsRun = RunningRecord & { createdAt: string };

const RECORD_TYPE_FROM_DB: Record<string, RunningRecordType> = {
  best_pace: "bestPace",
  best_pace_5k: "bestPace5k",
  best_pace_10k: "bestPace10k",
  longest_distance: "longestDistance",
  longest_duration: "longestDuration",
};

const emptyRecords = (): RunningStats["records"] => ({
  bestPace: null,
  bestPace5k: null,
  bestPace10k: null,
  longestDistance: null,
  longestDuration: null,
});

// today가 속한 달까지 count개월. 오래된 달부터.
export const getRecentMonths = (today: string, count: number = RUNNING_STATS_MONTHS) => {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
};

export const hasRuns = (stats: RunningStats) => stats.records.longestDistance !== null;

export const toRunningStats = ({
  hasWorkouts,
  monthRows,
  recordRows,
}: {
  hasWorkouts: boolean;
  monthRows: { month: string; distance_meters: number; run_count: number }[];
  recordRows: {
    record_type: string;
    workout_id: string;
    workout_date: string;
    distance_meters: number;
    duration_seconds: number;
  }[];
}): RunningStats => {
  const records = emptyRecords();
  for (const row of recordRows) {
    const type = RECORD_TYPE_FROM_DB[row.record_type];
    if (!type) continue;
    records[type] = {
      workoutId: row.workout_id,
      workoutDate: row.workout_date,
      distanceMeters: row.distance_meters,
      durationSeconds: row.duration_seconds,
    };
  }
  return {
    hasWorkouts,
    months: monthRows.map((row) => ({
      month: row.month.slice(0, 7),
      distanceMeters: Number(row.distance_meters),
      runCount: row.run_count,
    })),
    records,
  };
};

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
// 같은 값이면 먼저 세운 기록
const compareFirst = (left: RunningStatsRun, right: RunningStatsRun) =>
  compareText(left.workoutDate, right.workoutDate) ||
  compareText(left.createdAt, right.createdAt) ||
  compareText(left.workoutId, right.workoutId);
// 초/미터를 나누지 않고 곱해서 비교해 소수 오차를 피한다.
const comparePace = (left: RunningStatsRun, right: RunningStatsRun) =>
  left.durationSeconds * right.distanceMeters - right.durationSeconds * left.distanceMeters;

const pickBest = (runs: RunningStatsRun[], compare: (left: RunningStatsRun, right: RunningStatsRun) => number) => {
  let best: RunningStatsRun | null = null;
  for (const run of runs) {
    if (!best || (compare(run, best) || compareFirst(run, best)) < 0) best = run;
  }
  if (!best) return null;
  const { createdAt: _, ...record } = best;
  return record;
};

/**
 * runs는 이미 "내 러닝"으로 거른 목록이다. DB 함수와 같은 규칙으로 집계한다.
 * - today 뒤 날짜(미리 적어 둔 계획)는 세지 않는다.
 * - 거리나 시간이 0 이하인 행은 어디에도 넣지 않는다(DB는 check 제약으로 막는다).
 */
export const buildRunningStats = ({
  hasWorkouts,
  months = RUNNING_STATS_MONTHS,
  runs,
  today,
}: {
  hasWorkouts: boolean;
  months?: number;
  runs: RunningStatsRun[];
  today: string;
}): RunningStats => {
  const valid = runs.filter((run) => run.workoutDate <= today && run.distanceMeters > 0 && run.durationSeconds > 0);
  const recentMonths = getRecentMonths(today, months);
  const firstDay = `${recentMonths[0]}-01`;
  const totals = new Map(recentMonths.map((month) => [month, { distanceMeters: 0, runCount: 0 }]));
  for (const run of valid) {
    if (run.workoutDate < firstDay) continue;
    const total = totals.get(run.workoutDate.slice(0, 7));
    if (!total) continue;
    total.distanceMeters += run.distanceMeters;
    total.runCount += 1;
  }
  const atLeast = (meters: number) => valid.filter((run) => run.distanceMeters >= meters);

  return {
    hasWorkouts,
    months: recentMonths.map((month) => ({ month, ...(totals.get(month) ?? { distanceMeters: 0, runCount: 0 }) })),
    records: {
      bestPace: pickBest(atLeast(BEST_PACE_MIN_METERS), comparePace),
      bestPace5k: pickBest(atLeast(5000), comparePace),
      bestPace10k: pickBest(atLeast(10000), comparePace),
      longestDistance: pickBest(valid, (left, right) => right.distanceMeters - left.distanceMeters),
      longestDuration: pickBest(valid, (left, right) => right.durationSeconds - left.durationSeconds),
    },
  };
};
