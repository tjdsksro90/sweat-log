"use client";

import { type ComponentProps, createContext, type ReactNode, useContext } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * 화면은 실제 앱 경로("/workouts/123")로만 말하고, 그 경로를 어떤 주소로 열고 어떻게 이동할지는 여기서 바꿔 끼운다.
 * provider가 없으면 실제 앱 그대로 경로를 주소로 쓰고 Next 라우터로 이동한다.
 * 체험 데모처럼 주소 체계가 다른 곳은 provider로 자기 방식을 넘긴다.
 */
export type AppNavigation = {
  // 실제 앱 경로를 <a href>에 넣을 주소로 바꾼다.
  toHref: (path: string) => string;
  push: (path: string, options?: { scroll?: boolean }) => void;
  replace: (path: string) => void;
  // 지금 보고 있는 화면의 실제 앱 경로(쿼리 제외). 하단 탭의 현재 위치 표시에 쓴다.
  pathname: string;
};

const AppNavigationContext = createContext<AppNavigation | null>(null);

export function AppNavigationProvider({ value, children }: { value: AppNavigation; children: ReactNode }) {
  return <AppNavigationContext value={value}>{children}</AppNavigationContext>;
}

const toSameHref = (path: string) => path;

export const useAppHref = () => useContext(AppNavigationContext)?.toHref ?? toSameHref;

export const useAppRouter = (): Pick<AppNavigation, "push" | "replace"> => {
  const router = useRouter();
  return useContext(AppNavigationContext) ?? router;
};

export const useAppPathname = () => {
  const pathname = usePathname();
  return useContext(AppNavigationContext)?.pathname ?? pathname ?? "/";
};

type AppLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

// next/link와 같지만 href를 실제 앱 경로로 받아 provider의 주소로 바꾼다.
export function AppLink({ href, ...props }: AppLinkProps) {
  const toHref = useAppHref();
  return <Link href={toHref(href)} {...props} />;
}
