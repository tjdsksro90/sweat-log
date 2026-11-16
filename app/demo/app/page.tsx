import { Suspense } from "react";

import type { Metadata } from "next";

import { DemoApp } from "@/demo/ui/demo-app";

export const metadata: Metadata = { title: "땀일기 체험" };

// 체험 저장소는 브라우저에만 있으므로 화면 전체를 클라이언트에서 그린다(useSearchParams가 Suspense 경계까지 미룬다).
export default function DemoAppPage() {
  return (
    <Suspense>
      <DemoApp />
    </Suspense>
  );
}
