import { formatDistance, formatDuration, formatPace, getPaceSecondsPerKm } from "@/entities/workout/model/pace";
import type {
  RunningMonth,
  RunningRecord,
  RunningRecordType,
  RunningStats,
} from "@/entities/workout/model/running-stats";

export type RunningRecordRow = {
  type: RunningRecordType;
  label: string;
  value: string; // 표시 값. 기록이 없으면 "-"
  unit?: string;
  detail: string; // 날짜와 함께 볼 보조 수치, 기록이 없으면 무엇을 하면 생기는지
  href: string | null;
};

const RECORD_LABELS: Record<RunningRecordType, { label: string; empty: string }> = {
  bestPace: { label: "최고 페이스", empty: "1km 이상 달리면 기록돼요" },
  bestPace5k: { label: "5km 이상 최고 페이스", empty: "5km 이상 달리면 기록돼요" },
  bestPace10k: { label: "10km 이상 최고 페이스", empty: "10km 이상 달리면 기록돼요" },
  longestDistance: { label: "최장 거리", empty: "" },
  longestDuration: { label: "최장 시간", empty: "" },
};

const RECORD_ORDER: RunningRecordType[] = [
  "bestPace",
  "bestPace5k",
  "bestPace10k",
  "longestDistance",
  "longestDuration",
];

const describeRecord = (type: RunningRecordType, record: RunningRecord) => {
  const { distanceMeters, durationSeconds, workoutDate } = record;
  if (type === "longestDistance") {
    return { value: formatDistance(distanceMeters), detail: `${workoutDate} · ${formatDuration(durationSeconds)}` };
  }
  if (type === "longestDuration") {
    return { value: formatDuration(durationSeconds), detail: `${workoutDate} · ${formatDistance(distanceMeters)}` };
  }
  return {
    value: formatPace(getPaceSecondsPerKm(distanceMeters, durationSeconds)),
    unit: "/km",
    detail: `${workoutDate} · ${formatDistance(distanceMeters)}`,
  };
};

export const toRunningRecordRows = (records: RunningStats["records"]): RunningRecordRow[] =>
  RECORD_ORDER.map((type) => {
    const record = records[type];
    const { label, empty } = RECORD_LABELS[type];
    if (!record) return { type, label, value: "-", detail: empty, href: null };
    return { type, label, href: `/workouts/${record.workoutId}`, ...describeRecord(type, record) };
  });

// "2026-11" → "11월", 화면 읽기용은 "2026년 11월"
export const formatMonthShort = (month: string) => `${Number(month.slice(5, 7))}월`;
export const formatMonthLong = (month: string) => `${month.slice(0, 4)}년 ${formatMonthShort(month)}`;

export const getBusiestMonth = (months: RunningMonth[]) =>
  months.reduce<RunningMonth | null>(
    (best, month) => (month.distanceMeters > 0 && (!best || month.distanceMeters > best.distanceMeters) ? month : best),
    null,
  );

// 막대 높이(0~100%). 거리가 있으면 너무 낮아 안 보이지 않게 최소 높이를 둔다.
export const MIN_BAR_PERCENT = 4;
export const toBarPercent = (distanceMeters: number, maxMeters: number) => {
  if (distanceMeters <= 0 || maxMeters <= 0) return 0;
  return Math.max(MIN_BAR_PERCENT, Math.round((distanceMeters / maxMeters) * 100));
};
