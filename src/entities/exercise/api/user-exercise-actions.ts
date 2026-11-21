"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/shared/api/supabase/require-user";

import {
  type DeleteUserExerciseResult,
  findDuplicateExercise,
  getUserExerciseErrorMessage,
  isUserExerciseId,
  parseUserExerciseInput,
  type SaveUserExerciseResult,
  toUserExercises,
  type UserExercise,
  type UserExerciseInput,
} from "../model/user-exercise";

const USER_EXERCISE_SELECT = "id, name, body_part, bodyweight";

/**
 * 기록 폼의 종목 자동완성이 브라우저에서 부른다. 내 종목만 온다(RLS). 최대 100개라 한 번에 읽는다.
 * 기록 폼 파일을 고치지 않고 입력칸 안에서 읽으려고 서버 쿼리가 아닌 Server Action으로 둔다.
 */
export const listMyExercises = async (): Promise<UserExercise[]> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("user_exercises").select(USER_EXERCISE_SELECT).order("name");
  if (error) throw error;
  return toUserExercises(data);
};

// 내 종목이 보이는 곳: 설정의 내 종목 관리. 기록 폼의 추천은 브라우저 캐시를 입력칸이 다시 읽는다.
const revalidateExercisePaths = () => {
  revalidatePath("/settings/exercises");
};

// 만들기(id 없음)와 수정(id 있음)을 함께 받는다. 권한은 RLS, 모양·상한·이름 중복은 DB가 한 번 더 본다.
export const saveUserExercise = async (input: UserExerciseInput): Promise<SaveUserExerciseResult> => {
  const { supabase } = await requireUser();

  const parsed = parseUserExerciseInput(input);
  if (!parsed.ok) return parsed;
  const { id, name, bodyPart, bodyweight } = parsed.input;

  // 사전·내 다른 종목과 겹치면 새로 만들지 않고 그 종목을 알려 준다.
  const { data: rows, error: listError } = await supabase.from("user_exercises").select(USER_EXERCISE_SELECT);
  if (listError) return { error: getUserExerciseErrorMessage(listError), ok: false };
  const mine = toUserExercises(rows);
  const duplicate = findDuplicateExercise(name, mine, id);
  if (duplicate) return { duplicate, error: "같은 이름의 종목이 이미 있어요.", ok: false };

  const row = { body_part: bodyPart, bodyweight, name };

  if (!id) {
    const { data, error } = await supabase.from("user_exercises").insert(row).select(USER_EXERCISE_SELECT).single();
    if (error) return { error: getUserExerciseErrorMessage(error), ok: false };
    revalidateExercisePaths();
    return { exercise: toUserExercises([data])[0], ok: true };
  }

  // 남의 종목은 RLS 때문에 0건이 바뀐다. 조용히 성공으로 보지 않도록 바뀐 행을 돌려받는다.
  const { data, error } = await supabase.from("user_exercises").update(row).eq("id", id).select(USER_EXERCISE_SELECT);
  if (error) return { error: getUserExerciseErrorMessage(error), ok: false };
  if (data.length === 0) return { error: getUserExerciseErrorMessage({ message: "exercise_not_found" }), ok: false };

  revalidateExercisePaths();
  return { exercise: toUserExercises(data)[0], ok: true };
};

export const deleteUserExercise = async (id: string): Promise<DeleteUserExerciseResult> => {
  const { supabase } = await requireUser();
  if (!isUserExerciseId(id))
    return { error: getUserExerciseErrorMessage({ message: "exercise_not_found" }), ok: false };

  const { data, error } = await supabase.from("user_exercises").delete().eq("id", id).select("id");
  if (error) return { error: "종목을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요.", ok: false };
  if (data.length === 0) return { error: getUserExerciseErrorMessage({ message: "exercise_not_found" }), ok: false };

  revalidateExercisePaths();
  return { ok: true };
};
