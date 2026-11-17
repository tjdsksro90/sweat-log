"use client";

import { useSyncExternalStore } from "react";

/**
 * 체험 앱 주소(`?path=`)를 브라우저 주소에서 직접 읽는다.
 * useSearchParams는 정적 prerender에서 가장 가까운 Suspense까지 클라이언트 렌더로 미뤄 첫 HTML이 비고,
 * JS 뒤에 새로 그린 DOM이 늦은 LCP가 된다. 이 훅은 서버와 hydration에서 홈("")을 주고,
 * hydration이 끝나면 실제 주소로 다시 그린다. 그래서 홈은 서버 HTML의 DOM을 그대로 이어받는다.
 */
const LOCATION_EVENT = "sweat-log:demo-location";

const subscribeLocation = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener(LOCATION_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(LOCATION_EVENT, onChange);
  };
};
const getSearch = () => window.location.search;
const getServerSearch = () => "";

export const useDemoSearch = () => useSyncExternalStore(subscribeLocation, getSearch, getServerSearch);

// history.pushState·replaceState는 popstate를 내지 않으므로 바꾼 뒤 직접 알린다.
export const notifyDemoLocationChange = () => window.dispatchEvent(new Event(LOCATION_EVENT));

const subscribeNothing = () => () => {};

// 서버 렌더와 hydration 중에는 false, 그 뒤(그리고 클라이언트에서 새로 마운트할 때)는 true.
export const useHydrated = () =>
  useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
