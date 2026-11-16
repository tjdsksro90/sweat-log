import type { ReactNode } from "react";

import { ServiceWorkerRegistration } from "@/app/service-worker-registration";

// 홈 화면에서 처음 연 앱이 로그인 화면으로 시작하므로 여기서도 서비스 워커를 등록한다.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ServiceWorkerRegistration />
    </>
  );
}
