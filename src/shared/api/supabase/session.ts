import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/design", "/demo"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/**
 * 요청마다 Supabase 세션 쿠키를 갱신하고, 로그인하지 않은 사용자를 로그인 화면으로 보낸다.
 * 화면과 Server Action은 requireUser로 다시 확인한다. 여기서의 리다이렉트는 편의일 뿐 보안 경계가 아니다.
 */
export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({ request });
  const { publishableKey, url } = getSupabaseEnv();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, options, value } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (!isSignedIn && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  if (isSignedIn && (pathname === "/login" || pathname === "/signup")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
};
