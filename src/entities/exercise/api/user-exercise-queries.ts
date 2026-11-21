import "server-only";

import { requireUser } from "@/shared/api/supabase/require-user";

import { EXERCISES } from "../model/exercises";
import { normalizeExerciseName } from "../model/search-exercises";
import {
  type RecordedExerciseName,
  sortUserExercises,
  toUserExercises,
  type UserExercise,
} from "../model/user-exercise";

// 설정 > 내 종목. 내 것만 온다(RLS).
export const getMyExercises = async (): Promise<UserExercise[]> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("user_exercises").select("id, name, body_part, bodyweight");
  if (error) throw error;
  return sortUserExercises(toUserExercises(data));
};

// 사전은 앱 코드에 있어서 SQL이 limit 전에 뺄 수 있게 공백을 뺀 사전 이름을 넘긴다.
const DICTIONARY_KEYS = EXERCISES.map((exercise) => normalizeExerciseName(exercise.name));

// 내가 쓴 헬스 기록의 종목 이름 가운데 사전·내 종목에 없는 것(공백을 뺀 이름으로 묶음). 많이 쓴 것부터.
// 화면은 findRecordOnlyExercises로 한 번 더 거른다(대소문자 등 규칙이 같아 결과는 같다).
export const getMyRecordedExerciseNames = async (): Promise<RecordedExerciseName[]> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("get_my_exercise_names", { p_exclude: DICTIONARY_KEYS });
  if (error) throw error;
  return data.map((row) => ({ name: row.exercise_name, workoutCount: row.workout_count }));
};
