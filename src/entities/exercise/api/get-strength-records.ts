import "server-only";

import { requireUser } from "@/shared/api/supabase/require-user";

import { STRENGTH_RECORD_LIMIT, type StrengthRecord } from "../model/strength-records";

export const getStrengthRecords = async (today: string): Promise<StrengthRecord[]> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("get_strength_records", {
    p_today: today,
    p_limit: STRENGTH_RECORD_LIMIT,
  });
  if (error) throw error;
  return data.map((row) => ({
    exerciseName: row.exercise_name,
    maxWeightKg: row.max_weight_kg === null ? null : Number(row.max_weight_kg),
    workoutId: row.workout_id,
    workoutDate: row.workout_date,
    workoutCount: row.workout_count,
  }));
};
