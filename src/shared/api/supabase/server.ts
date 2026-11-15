import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

export const createClient = async () => {
  const cookieStore = await cookies();
  const { publishableKey, url } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, options, value } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component는 쿠키를 쓸 수 없다. 세션 갱신은 proxy.ts가 맡는다.
        }
      },
    },
  });
};
