"use server";

import { revalidatePath } from "next/cache";

import { type RoutineInput, toRoutineExercisesJson } from "@/entities/routine/model/routine";
import { requireUser } from "@/shared/api/supabase/require-user";

import { getRoutineErrorMessage, parseRoutineInput } from "../model/routine-form";
import { isUuid } from "../model/save-workout-input";

export type SaveRoutineResult = { ok: true; id: string } | { ok: false; error: string };
export type DeleteRoutineResult = { ok: true } | { ok: false; error: string };

// 루틴이 보이는 곳: 내 루틴 목록과 편집, 기록 작성 폼의 불러오기
const revalidateRoutinePaths = () => {
  revalidatePath("/settings/routines", "layout");
  revalidatePath("/workouts/new");
};

// 만들기(id 없음)와 수정(id 있음)을 함께 받는다. 권한은 RLS, 모양·상한은 check 제약과 트리거가 한 번 더 본다.
export const saveRoutine = async (input: RoutineInput): Promise<SaveRoutineResult> => {
  const { supabase } = await requireUser();

  const parsed = parseRoutineInput(input);
  if (!parsed.ok) return parsed;

  const { id, name, exercises } = parsed.input;
  const row = { exercises: toRoutineExercisesJson(exercises), name };

  if (!id) {
    const { data, error } = await supabase.from("workout_routines").insert(row).select("id").single();
    if (error) return { error: getRoutineErrorMessage(error), ok: false };
    revalidateRoutinePaths();
    return { id: data.id, ok: true };
  }

  // 남의 루틴은 RLS 때문에 0건이 바뀐다. 조용히 성공으로 보지 않도록 바뀐 행을 돌려받는다.
  const { data, error } = await supabase.from("workout_routines").update(row).eq("id", id).select("id");
  if (error) return { error: getRoutineErrorMessage(error), ok: false };
  if (data.length === 0) return { error: getRoutineErrorMessage({ message: "routine_not_found" }), ok: false };

  revalidateRoutinePaths();
  return { id, ok: true };
};

export const deleteRoutine = async (id: string): Promise<DeleteRoutineResult> => {
  const { supabase } = await requireUser();
  if (!isUuid(id)) return { error: getRoutineErrorMessage({ message: "routine_not_found" }), ok: false };

  const { data, error } = await supabase.from("workout_routines").delete().eq("id", id).select("id");
  if (error) return { error: "루틴을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요.", ok: false };
  if (data.length === 0) return { error: getRoutineErrorMessage({ message: "routine_not_found" }), ok: false };

  revalidateRoutinePaths();
  return { ok: true };
};
