import "server-only";

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

// 남의 루틴이나 없는 id는 null. 둘을 구분하지 않는다.
export const getRoutine = async (id: string): Promise<Routine | null> => {
  if (!UUID_PATTERN.test(id)) return null;
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("workout_routines").select(ROUTINE_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toRoutine(data) : null;
};
