"use client";

import { useEffect } from "react";

/**
 * public/sw.js를 등록한다. 개발 서버에서는 HMR 응답과 섞이지 않도록 프로덕션 빌드에서만 등록한다.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // 등록 실패는 앱 사용을 막지 않는다. 설치와 오프라인 안내만 빠진다.
    });
  }, []);

  return null;
}
