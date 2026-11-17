import "server-only";

import { unstable_rethrow } from "next/navigation";

import { requireUser } from "@/shared/api/supabase/require-user";

import { type Routine, toRoutine } from "../model/routine";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROUTINE_SELECT = "id, name, exercises, updated_at";

// 내 루틴만 온다(RLS). 최근에 고친 것부터.
export const getMyRoutines = async (): Promise<Routine[]> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("workout_routines")
    .select(ROUTINE_SELECT)
    .order("updated_at", { ascending: false })
    .order("id");
  if (error) throw error;
  return data.map(toRoutine);
};

/**
 * 기록 작성·수정 폼용. 루틴은 곁들이는 기능이라 조회가 실패해도(일시 오류, 아직 테이블이 없는 DB) 폼은 열어야 한다.
 * 실패하면 undefined를 돌려 불러오기 버튼만 숨긴다. 빈 배열은 "루틴이 없음"이라 버튼과 안내를 보여 주므로 구분한다.
 */
export const getMyRoutinesForForm = async (): Promise<Routine[] | undefined> => {
  try {
    return await getMyRoutines();
  } catch (error) {
    // 로그인 만료 redirect 같은 Next 내부 흐름은 삼키지 않는다.
    unstable_rethrow(error);
    // biome-ignore lint/suspicious/noConsole: 화면은 버튼만 숨기므로 실패를 볼 곳이 서버 로그뿐이다.
    console.error("[routine] 루틴을 읽지 못해 불러오기를 숨겨요.", error);
    return undefined;
  }
};

// 새 루틴 화면에 들어올 때 상한(30개)에 닿았는지 본다. 행은 읽지 않고 개수만 센다.
export const countMyRoutines = async (): Promise<number> => {
  const { supabase } = await requireUser();
  const { count, error } = await supabase.from("workout_routines").select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
};

// 남의 루틴이나 없는 id는 null. 둘을 구분하지 않는다.
export const getRoutine = async (id: string): Promise<Routine | null> => {
  if (!UUID_PATTERN.test(id)) return null;
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("workout_routines").select(ROUTINE_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toRoutine(data) : null;
};
