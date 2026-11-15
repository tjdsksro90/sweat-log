"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isUuid } from "@/entities/crew/model/uuid";
import { requireUser } from "@/shared/api/supabase/require-user";

import {
  type CrewFormState,
  getCrewErrorMessage,
  normalizeInviteCode,
  validateCrewName,
  validateInviteCode,
} from "../model/crew-form";

export const createCrew = async (_state: CrewFormState, formData: FormData): Promise<CrewFormState> => {
  const { supabase } = await requireUser();
  const name = formData.get("name");
  const error = validateCrewName(name);
  if (error || typeof name !== "string") return { error };
  const result = await supabase.rpc("create_crew", { p_name: name.trim() });
  if (result.error) return { error: getCrewErrorMessage(result.error.message) };
  revalidatePath("/", "layout");
  redirect(`/crews/${result.data.id}`);
};

export const joinCrew = async (_state: CrewFormState, formData: FormData): Promise<CrewFormState> => {
  const { supabase } = await requireUser();
  const code = formData.get("inviteCode");
  const error = validateInviteCode(code);
  if (error || typeof code !== "string") return { error };
  const result = await supabase.rpc("join_crew_by_code", { p_invite_code: normalizeInviteCode(code) });
  if (result.error) return { error: getCrewErrorMessage(result.error.message) };
  revalidatePath("/", "layout");
  redirect(`/crews/${result.data.id}`);
};

export const leaveCrew = async (_state: CrewFormState, formData: FormData): Promise<CrewFormState> => {
  const { supabase, user } = await requireUser();
  const crewId = formData.get("crewId");
  if (!isUuid(crewId)) return { error: "크루를 다시 확인해 주세요." };
  const membership = await supabase
    .from("crew_members")
    .select("role")
    .eq("crew_id", crewId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership.error) return { error: getCrewErrorMessage(membership.error.message) };
  if (!membership.data) return { error: "가입한 크루가 아니에요." };
  if (membership.data.role === "owner") return { error: "크루장은 크루를 나갈 수 없어요." };
  const result = await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("user_id", user.id)
    .neq("role", "owner")
    .select("crew_id");
  if (result.error) return { error: getCrewErrorMessage(result.error.message) };
  if (!result.data.length) return { error: "크루를 나가지 못했어요. 다시 확인해 주세요." };
  revalidatePath("/", "layout");
  redirect("/crews");
};
