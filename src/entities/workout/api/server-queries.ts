import "server-only";

import type { WeeklySummary, WorkoutDetail, WorkoutListFilter, WorkoutPage } from "@/entities/workout/model/contracts";
import { addDays, buildWeeklySummary, getKstToday, getWeekStart } from "@/entities/workout/model/weekly-summary";
import { decodeWorkoutCursor, encodeWorkoutCursor } from "@/entities/workout/model/workout-cursor";
import { toWorkoutDetail, toWorkoutListItem } from "@/entities/workout/model/workout-mappers";
import { requireUser } from "@/shared/api/supabase/require-user";

const PAGE_SIZE = 20;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 결과 행은 model/workout-mappers.ts의 WorkoutListRow 모양이어야 한다(타입 추론으로 검사된다).
// workouts → profiles 관계가 workout_companions·workout_comments를 거쳐서도 이어져서 FK 이름으로 고른다.
const LIST_SELECT = `
  id, kind, workout_date, title, place_name, duration_seconds, created_at, user_id,
  author:profiles!workouts_user_id_fkey(id, nickname),
  crew:crews!workouts_crew_id_fkey(id, name),
  companions:workout_companions(profile:profiles!workout_companions_user_id_fkey(id, nickname)),
  run:run_details(distance_meters, duration_seconds),
  sets:strength_sets(exercise_name, exercise_order, set_order, weight_kg, reps),
  comments:workout_comments(count)
`;

const DETAIL_SELECT = `${LIST_SELECT}, memo`;

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
export const getWorkoutDetail = async (id: string): Promise<WorkoutDetail | null> => {
  if (!UUID_PATTERN.test(id)) return null;

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("workouts").select(DETAIL_SELECT).eq("id", id).maybeSingle();

  if (error) throw error;
  return data ? toWorkoutDetail(data, user.id) : null;
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
