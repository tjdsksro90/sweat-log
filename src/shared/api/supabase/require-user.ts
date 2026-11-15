import "server-only";

import { cache } from "react";

import { redirect } from "next/navigation";

import { createClient } from "./server";

/**
 * 로그인 세션이 없으면 로그인 화면으로 보낸다. 화면과 Server Action의 공통 진입점.
 * 한 요청 안에서 layout과 page가 각각 부르므로 cache로 감싸 검증을 한 번만 한다.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  return { supabase, user: { id: userId } };
});
