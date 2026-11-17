import type { Metadata } from "next";

import { createPrerenderGuardScript } from "@/demo/model/prerender-guard";
import { createDemoStore } from "@/demo/store";
import { DemoApp } from "@/demo/ui/demo-app";

export const metadata: Metadata = { title: "땀일기 체험" };

// 샘플 데이터가 "오늘" 기준이라 미리 그린 홈도 날짜가 바뀌면 다시 만든다. 늦어도 10분 안에 새 날짜로 바뀌고,
// 그 사이에는 가드 스크립트가 지난 날짜의 홈을 숨긴다.
export const revalidate = 600;

/**
 * 체험 저장소는 브라우저에만 있다. 서버는 처음 방문과 같은 샘플로 홈을 미리 그려 JS 없이도 첫 화면이 보이게 하고,
 * 브라우저가 hydration 뒤 실제 주소와 저장소로 바꿔 그린다.
 */
export default function DemoAppPage() {
  const home = createDemoStore({ storage: () => null }).readHome();
  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 서버가 만든 고정 문자열이고, 미리 그린 홈보다 먼저 실행돼야 한다. */}
      <script dangerouslySetInnerHTML={{ __html: createPrerenderGuardScript(home.today) }} />
      <DemoApp prerenderedHome={home} />
    </>
  );
}
