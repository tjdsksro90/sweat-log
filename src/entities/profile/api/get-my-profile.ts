import "server-only";

import { requireUser } from "@/shared/api/supabase/require-user";

export const getMyProfile = async () => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("profiles").select("id, nickname").eq("id", user.id).single();

  if (error) throw error;
  return data;
};
