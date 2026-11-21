import "server-only";

import { unstable_rethrow } from "next/navigation";

import type {
  StrengthExercise,
  WeeklySummary,
  WorkoutDetail,
  WorkoutListFilter,
  WorkoutPage,
} from "@/entities/workout/model/contracts";
import { PHOTO_URL_EXPIRES_IN, WORKOUT_PHOTO_BUCKET } from "@/entities/workout/model/photo";
import {
  getRecentStrengthRange,
  RECENT_STRENGTH_LIMIT,
  type RecentStrengthWorkout,
} from "@/entities/workout/model/recent-strength";
import { RUNNING_STATS_MONTHS, type RunningStats, toRunningStats } from "@/entities/workout/model/running-stats";
import { addDays, buildWeeklySummary, getKstToday, getWeekStart } from "@/entities/workout/model/weekly-summary";
import { decodeWorkoutCursor, encodeWorkoutCursor } from "@/entities/workout/model/workout-cursor";
import { toExercises, toWorkoutDetail, toWorkoutListItem } from "@/entities/workout/model/workout-mappers";
import { requireUser } from "@/shared/api/supabase/require-user";

const PAGE_SIZE = 20;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 결과 행은 model/workout-mappers.ts의 WorkoutListRow 모양이어야 한다(타입 추론으로 검사된다).
// workouts → profiles 관계가 workout_companions·workout_comments를 거쳐서도 이어져서 FK 이름으로 고른다.
const LIST_SELECT = `
  id, kind, workout_date, title, place_name, duration_seconds, created_at, user_id,
  author:profiles!workouts_user_id_fkey(id, nickname),
  crew:crews!workouts_crew_id_fkey(id, name),
  companions:workout_companions(user_id, profile:profiles!workout_companions_user_id_fkey(id, nickname)),
  run:run_details(distance_meters, duration_seconds),
  sets:strength_sets(exercise_name, exercise_order, set_order, weight_kg, reps),
  comments:workout_comments(count),
  photos:workout_photos(count)
`;

const DETAIL_SELECT = `${LIST_SELECT}, memo, photo_rows:workout_photos(id, path, position, width, height)`;

/**
 * 기록 목록. 날짜 → 작성 시각 내림차순으로 20개씩.
 * filter.crewId가 없으면 내 기록(내가 쓴 것 + 함께한 친구로 들어간 것), 있으면 그 크루의 피드다.
 */
export const getWorkoutPage = async (filter: WorkoutListFilter = {}): Promise<WorkoutPage> => {
  const { supabase } = await requireUser();
  const cursor = filter.cursor ? decodeWorkoutCursor(filter.cursor) : null;

  const { data, error } = await supabase
    .rpc("list_workouts", {
      p_crew_id: filter.crewId,
      p_from: filter.from,
      p_to: filter.to,
      p_kind: filter.kind,
      p_cursor_date: cursor?.workoutDate,
      p_cursor_created_at: cursor?.createdAt,
      p_cursor_id: cursor?.id,
    })
    .select(LIST_SELECT)
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (error) throw error;

  const rows = data.slice(0, PAGE_SIZE);
  const last = rows.at(-1);
  const hasMore = data.length > PAGE_SIZE;

  return {
    items: rows.map(toWorkoutListItem),
    nextCursor:
      hasMore && last
        ? encodeWorkoutCursor({ workoutDate: last.workout_date, createdAt: last.created_at, id: last.id })
        : null,
  };
};

// 볼 권한이 없거나 없는 기록이면 null. 화면은 notFound()로 처리한다.
/**
 * "이 구성으로 루틴 만들기"용. 헬스 기록의 제목과 종목·세트만 읽는다.
 * 상세(getWorkoutDetail)는 사진 서명 URL까지 만들어서 여기 쓰기엔 무겁다. 볼 수 있는지는 같은 RLS가 판단한다.
 * 볼 수 없거나 헬스가 아니면 null.
 */
export const getStrengthWorkoutTemplate = async (
  id: string,
): Promise<{ title: string | null; exercises: StrengthExercise[] } | null> => {
  if (!UUID_PATTERN.test(id)) return null;

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("workouts")
    .select("kind, title, sets:strength_sets(exercise_name, exercise_order, set_order, weight_kg, reps)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.kind !== "strength") return null;
  return { exercises: toExercises(data.sets), title: data.title };
};

export const getWorkoutDetail = async (id: string): Promise<WorkoutDetail | null> => {
  if (!UUID_PATTERN.test(id)) return null;

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("workouts").select(DETAIL_SELECT).eq("id", id).maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return toWorkoutDetail(
    data,
    user.id,
    await signPhotoPaths(
      supabase,
      data.photo_rows.map((photo) => photo.path),
    ),
  );
};

/**
 * 비공개 버킷이라 사진마다 서명 URL을 만든다. 발급도 Storage 정책(그 기록을 볼 수 있는 사람)을 따른다.
 * 사진을 못 불러와도 기록은 보여야 하므로 실패는 빈 결과로 넘기고, 화면은 그 사진을 빼고 그린다.
 */
const signPhotoPaths = async (
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  paths: string[],
): Promise<Record<string, string>> => {
  if (paths.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(WORKOUT_PHOTO_BUCKET)
    .createSignedUrls(paths, PHOTO_URL_EXPIRES_IN);
  if (error) return {};

  return Object.fromEntries(
    data.flatMap((item) => (item.path && item.signedUrl && !item.error ? [[item.path, item.signedUrl]] : [])),
  );
};

/**
 * 이번 주(월요일 시작, 한국 시간) 요약. 내가 작성한 기록만 센다.
 * 친구가 나를 동행자로 넣은 기록은 친구의 거리·볼륨이라 내 합계에 넣지 않는다.
 */
export const getWeeklySummary = async (today: string = getKstToday()): Promise<WeeklySummary> => {
  const { supabase, user } = await requireUser();
  const weekStart = getWeekStart(today);

  const [week, streak] = await Promise.all([
    supabase
      .from("workouts")
      .select("kind, workout_date, run:run_details(distance_meters), sets:strength_sets(weight_kg, reps)")
      .eq("user_id", user.id)
      .gte("workout_date", weekStart)
      .lte("workout_date", addDays(weekStart, 6)),
    // 오늘 아직 안 했으면 어제부터 센다. 기간 제한 없이 DB가 날짜 중복을 지우고 센다.
    supabase.rpc("get_workout_streak", { p_today: today }),
  ]);

  if (week.error) throw week.error;
  if (streak.error) throw streak.error;

  return buildWeeklySummary({
    today,
    weekWorkouts: week.data,
    streakDays: streak.data,
  });
};

/**
 * 러닝 통계. 내가 작성했거나 함께한 친구로 들어간 러닝만 DB 함수가 집계한다(행 제한에 잘리지 않게).
 * hasWorkouts는 종류와 상관없이 내 기록이 있는지로, 빈 상태 문구를 고르는 데만 쓴다.
 */
export const getRunningStats = async (today: string = getKstToday()): Promise<RunningStats> => {
  const { supabase } = await requireUser();

  const [months, records, anyWorkout] = await Promise.all([
    supabase.rpc("get_running_monthly_distance", { p_today: today, p_months: RUNNING_STATS_MONTHS }),
    supabase.rpc("get_running_records", { p_today: today }),
    supabase.rpc("list_workouts", {}).select("id").limit(1),
  ]);

  if (months.error) throw months.error;
  if (records.error) throw records.error;
  if (anyWorkout.error) throw anyWorkout.error;

  return toRunningStats({
    hasWorkouts: anyWorkout.data.length > 0,
    monthRows: months.data,
    recordRows: records.data,
  });
};

/**
 * 헬스 기록 작성 폼의 "최근 기록 불러오기". 오늘 포함 7일(한국 날짜) 안의 내가 쓴 헬스 기록만 최근 것부터.
 * 동행자로 들어간 친구 기록은 RLS로는 보이지만 user_id로 거른다. 수정 화면은 지금 고치는 기록(excludeId)을 뺀다.
 */
export const getRecentStrengthWorkouts = async ({
  today = getKstToday(),
  excludeId,
}: {
  today?: string;
  excludeId?: string;
} = {}): Promise<RecentStrengthWorkout[]> => {
  const { supabase, user } = await requireUser();
  const { from, to } = getRecentStrengthRange(today);

  let query = supabase
    .from("workouts")
    .select("id, workout_date, title, sets:strength_sets(exercise_name, exercise_order, set_order, weight_kg, reps)")
    .eq("user_id", user.id)
    .eq("kind", "strength")
    .gte("workout_date", from)
    .lte("workout_date", to);
  if (excludeId && UUID_PATTERN.test(excludeId)) query = query.neq("id", excludeId);

  const { data, error } = await query
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(RECENT_STRENGTH_LIMIT);
  if (error) throw error;

  return data.flatMap((row) => {
    const exercises = toExercises(row.sets);
    return exercises.length > 0 ? [{ exercises, id: row.id, title: row.title, workoutDate: row.workout_date }] : [];
  });
};

// 폼용. 곁들이는 기능이라 조회가 실패해도 폼은 연다. undefined면 버튼만 숨긴다(루틴 불러오기와 같은 원칙).
export const getRecentStrengthWorkoutsForForm = async (
  options: { today?: string; excludeId?: string } = {},
): Promise<RecentStrengthWorkout[] | undefined> => {
  try {
    return await getRecentStrengthWorkouts(options);
  } catch (error) {
    unstable_rethrow(error);
    // biome-ignore lint/suspicious/noConsole: 화면은 버튼만 숨기므로 실패를 볼 곳이 서버 로그뿐이다.
    console.error("[workout] 최근 헬스 기록을 읽지 못해 불러오기를 숨겨요.", error);
    return undefined;
  }
};
