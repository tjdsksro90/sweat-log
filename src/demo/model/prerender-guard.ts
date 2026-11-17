import { DEMO_STORAGE_KEY } from "../store";

export const DEMO_PRERENDER_ID = "demo-prerender";

/**
 * 미리 그린 샘플 홈은 "오늘 처음 들어온 홈"과 같을 때만 보여야 한다.
 * HTML을 읽는 도중 실행되는 인라인 스크립트로 그 밖의 경우(다른 경로, 이 탭에 저장된 체험,
 * 그린 날과 다른 날짜, 저장소를 못 읽음)에는 그리기 전에 숨긴다. 숨기면 고치기 전처럼 JS가 화면을 그릴 때까지 빈 화면이다.
 * React가 관리하지 않는 <head>에 style만 더해 hydration에 영향이 없다.
 */
export const createPrerenderGuardScript = (today: string) =>
  [
    "(function(){try{",
    'var p=new URLSearchParams(location.search).get("path");',
    'var t=new Intl.DateTimeFormat("en-CA",{day:"2-digit",month:"2-digit",timeZone:"Asia/Seoul",year:"numeric"}).format(new Date());',
    `if((p===null||p==="/")&&t===${JSON.stringify(today)}&&sessionStorage.getItem(${JSON.stringify(DEMO_STORAGE_KEY)})===null)return}catch(e){}`,
    'var s=document.createElement("style");',
    `s.textContent="#${DEMO_PRERENDER_ID}{visibility:hidden}";`,
    "document.head.appendChild(s)})()",
  ].join("");
