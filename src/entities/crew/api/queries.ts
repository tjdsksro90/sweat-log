import "server-only";

import type { CrewDetail, CrewSummary } from "@/entities/crew/model/crew";
import { isUuid } from "@/entities/crew/model/uuid";
import { requireUser } from "@/shared/api/supabase/require-user";

export const getMyCrews = async (): Promise<CrewSummary[]> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("crews").select("id, name, crew_members(count)").order("created_at");
  if (error) throw new Error("크루 목록을 불러오지 못했어요.");
  return data.map((crew) => ({ id: crew.id, name: crew.name, memberCount: crew.crew_members[0]?.count ?? 0 }));
};

export const getCrew = async (crewId: string): Promise<CrewDetail | null> => {
  if (!isUuid(crewId)) return null;
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("crews")
    .select("id, name, invite_code, owner_id, crew_members(user_id, role, joined_at, profiles(nickname))")
    .eq("id", crewId)
    .maybeSingle();
  if (error) throw new Error("크루를 불러오지 못했어요.");
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    ownerId: data.owner_id,
    members: data.crew_members
      .sort((a, b) => a.joined_at.localeCompare(b.joined_at) || a.user_id.localeCompare(b.user_id))
      .map((member) => ({
        userId: member.user_id,
        nickname: member.profiles?.nickname ?? "크루 친구",
        isOwner: member.role === "owner",
      })),
  };
};
