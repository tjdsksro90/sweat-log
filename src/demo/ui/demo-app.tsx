"use client";

import { useEffect, useMemo, useRef } from "react";

import { useSearchParams } from "next/navigation";

import { type AppNavigation, AppNavigationProvider } from "@/shared/lib/app-navigation";
import { BottomNavigation } from "@/widgets/bottom-navigation";

import { DEMO_APP_PATH, parseAppPath, readAppPath, toDemoHref } from "../model/demo-path";
import { DemoNoticeProvider } from "./demo-notice";
import { DemoRoutes } from "./demo-routes";

const HASH_SCROLL_FRAMES = 30;

/**
 * 체험 앱의 루트. 실제 앱 화면을 그대로 쓰고, 이동과 데이터만 바꿔 끼운다.
 * 이동은 `?path=`만 바꾸는 history 갱신이라 서버를 다시 부르지 않는다.
 */
export function DemoApp() {
  const searchParams = useSearchParams();
  const location = useMemo(() => parseAppPath(readAppPath(searchParams)), [searchParams]);
  const scrollOnNextPath = useRef(false);

  const navigation = useMemo<AppNavigation>(
    () => ({
      toHref: toDemoHref,
      push: (path, options) => {
        scrollOnNextPath.current = options?.scroll !== false;
        window.history.pushState(null, "", toDemoHref(path));
      },
      replace: (path) => {
        scrollOnNextPath.current = true;
        window.history.replaceState(null, "", toDemoHref(path));
      },
      pathname: location.pathname,
    }),
    [location.pathname],
  );

  // 해시가 있으면 데이터가 그려질 때까지 몇 프레임 기다렸다가 그 위치로, 아니면 새 화면의 맨 위로 간다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: 경로가 바뀔 때만 스크롤한다.
  useEffect(() => {
    if (location.hash) {
      let frame = 0;
      let handle = 0;
      const scrollToHash = () => {
        const target = document.getElementById(location.hash);
        if (target) target.scrollIntoView();
        else if (frame++ < HASH_SCROLL_FRAMES) handle = requestAnimationFrame(scrollToHash);
      };
      scrollToHash();
      scrollOnNextPath.current = false;
      return () => cancelAnimationFrame(handle);
    }
    if (scrollOnNextPath.current) window.scrollTo(0, 0);
    scrollOnNextPath.current = false;
  }, [location.path]);

  /**
   * 화면 속 링크(AppLink)는 `/demo/app?path=…`를 가리킨다. Next Link가 서버로 이동하기 전에 가로챈다.
   * body의 capture 단계에서 받는다. Next는 React 루트를 document에 두므로,
   * document capture에 있는 작성 중 이탈 확인이 먼저 받아 멈출 수 있고 Link의 onClick(bubble)보다는 앞선다.
   */
  const pushRef = useRef(navigation.push);
  pushRef.current = navigation.push;
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download"))
        return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== DEMO_APP_PATH) return;
      event.preventDefault();
      pushRef.current(readAppPath(url.search));
    };
    document.body.addEventListener("click", handleClick, true);
    return () => document.body.removeEventListener("click", handleClick, true);
  }, []);

  return (
    <AppNavigationProvider value={navigation}>
      <DemoNoticeProvider>
        <DemoRoutes location={location} />
        <BottomNavigation />
      </DemoNoticeProvider>
    </AppNavigationProvider>
  );
}
