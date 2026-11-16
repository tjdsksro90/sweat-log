"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LeaveAction = () => void;

/**
 * 작성 중에 화면을 떠나려 하면 확인을 받는다.
 * - 새로고침·탭 닫기: beforeunload(브라우저 기본 확인창)
 * - 앱 안 링크(하단 탭 등): 문서 capture 단계에서 클릭을 가로챈다. React·Next Link보다 먼저 받는다.
 *   확인하면 같은 링크를 다시 눌러 Link가 직접 이동하게 한다. 주소 체계가 다른 체험 데모에서도 그대로 동작한다.
 * - 브라우저 뒤로 가기: 같은 주소로 history 항목을 하나 더 쌓아 두고, 그 항목이 빠지면 확인을 띄운다.
 * pendingLeave가 있으면 확인 시트를 연다. confirmLeave는 미뤄 둔 이동을 실행하고, cancelLeave는 머문다.
 */
export const useLeaveGuard = (enabled: boolean) => {
  const [pendingLeave, setPendingLeave] = useState<LeaveAction | null>(null);
  const leavingRef = useRef(false);
  const hasSentinelRef = useRef(false);

  const isGuarding = useCallback(() => enabled && !leavingRef.current, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leavingRef.current) return;
      event.preventDefault();
    };

    const handleClick = (event: MouseEvent) => {
      if (leavingRef.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download"))
        return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingLeave(() => () => anchor.click());
    };

    // Next 라우터가 history.state에 경로 정보를 두므로 같은 state로 쌓는다.
    if (!hasSentinelRef.current) {
      window.history.pushState(window.history.state, "", window.location.href);
      hasSentinelRef.current = true;
    }

    const handlePopState = () => {
      if (leavingRef.current) return;
      hasSentinelRef.current = false;
      setPendingLeave(() => () => window.history.back());
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled]);

  // 닫기 버튼처럼 앱이 직접 이동할 때. 작성 중이 아니면 바로 이동한다.
  const requestLeave = useCallback(
    (leave: LeaveAction) => {
      if (isGuarding()) setPendingLeave(() => leave);
      else leave();
    },
    [isGuarding],
  );

  const confirmLeave = useCallback(() => {
    const leave = pendingLeave;
    leavingRef.current = true;
    setPendingLeave(null);
    leave?.();
  }, [pendingLeave]);

  const cancelLeave = useCallback(() => {
    // 뒤로 가기로 빠진 항목을 다시 쌓아 다음 뒤로 가기도 막는다.
    if (enabled && !hasSentinelRef.current) {
      window.history.pushState(window.history.state, "", window.location.href);
      hasSentinelRef.current = true;
    }
    setPendingLeave(null);
  }, [enabled]);

  // 저장·삭제가 끝나 다른 화면으로 보낼 때. 이후 이동은 확인하지 않는다.
  const allowLeave = useCallback(() => {
    leavingRef.current = true;
  }, []);

  return { allowLeave, cancelLeave, confirmLeave, isLeavePending: pendingLeave !== null, requestLeave };
};
