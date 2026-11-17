/**
 * 화면은 실제 앱 경로("/workouts/123?view=calendar#title")로 말한다.
 * 체험 데모는 그 경로를 `/demo/app?path=…` 하나에 담아, 주소가 바뀌어도 같은 페이지 안에서 화면만 바꾼다.
 */
export const DEMO_APP_PATH = "/demo/app";
const PATH_PARAM = "path";

export type SearchParams = Record<string, string | string[] | undefined>;

export type DemoRoute =
  | { name: "home" }
  | { name: "workouts" }
  | { name: "workout-new" }
  | { name: "workout-detail"; workoutId: string }
  | { name: "workout-edit"; workoutId: string }
  | { name: "crews" }
  | { name: "crew-detail"; crewId: string }
  | { name: "settings" }
  | { name: "routines" }
  | { name: "routine-new" }
  | { name: "routine-edit"; routineId: string }
  | { name: "not-found" };

export type DemoLocation = {
  // 쿼리와 해시를 포함한 실제 앱 경로
  path: string;
  pathname: string;
  searchParams: SearchParams;
  hash: string;
  route: DemoRoute;
};

// 다른 사이트로 나가는 주소("//example.com", "https://…")는 받지 않고 홈으로 둔다.
export const normalizeAppPath = (path: string | null | undefined) =>
  path?.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : "/";

export const toDemoHref = (path: string) => {
  const appPath = normalizeAppPath(path);
  return appPath === "/" ? DEMO_APP_PATH : `${DEMO_APP_PATH}?${new URLSearchParams({ [PATH_PARAM]: appPath })}`;
};

// `/demo/app` 주소의 쿼리 문자열에서 실제 앱 경로를 꺼낸다.
export const readAppPath = (search: string | URLSearchParams | null) =>
  normalizeAppPath(new URLSearchParams(search ?? "").get(PATH_PARAM));

const toSearchParams = (params: URLSearchParams): SearchParams => {
  const result: SearchParams = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    result[key] = values.length > 1 ? values : values[0];
  }
  return result;
};

const ROUTES: [RegExp, (match: RegExpMatchArray) => DemoRoute][] = [
  [/^\/$/, () => ({ name: "home" })],
  [/^\/workouts$/, () => ({ name: "workouts" })],
  [/^\/workouts\/new$/, () => ({ name: "workout-new" })],
  [/^\/workouts\/([^/]+)$/, (match) => ({ name: "workout-detail", workoutId: match[1] })],
  [/^\/workouts\/([^/]+)\/edit$/, (match) => ({ name: "workout-edit", workoutId: match[1] })],
  [/^\/crews$/, () => ({ name: "crews" })],
  [/^\/crews\/([^/]+)$/, (match) => ({ name: "crew-detail", crewId: match[1] })],
  [/^\/settings$/, () => ({ name: "settings" })],
  [/^\/settings\/routines$/, () => ({ name: "routines" })],
  [/^\/settings\/routines\/new$/, () => ({ name: "routine-new" })],
  [/^\/settings\/routines\/([^/]+)$/, (match) => ({ name: "routine-edit", routineId: match[1] })],
];

export const matchDemoRoute = (pathname: string): DemoRoute => {
  for (const [pattern, toRoute] of ROUTES) {
    const match = pathname.match(pattern);
    if (match) return toRoute(match);
  }
  return { name: "not-found" };
};

// 잘못된 % 인코딩은 그대로 둔다. 경로라면 없는 화면으로 간다.
const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const parseAppPath = (path: string): DemoLocation => {
  const appPath = normalizeAppPath(path);
  const url = new URL(appPath, "http://demo.local");
  // 끝의 "/"는 실제 앱처럼 없는 것으로 본다.
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  return {
    path: appPath,
    pathname,
    searchParams: toSearchParams(url.searchParams),
    hash: safeDecode(url.hash.slice(1)),
    route: matchDemoRoute(safeDecode(pathname)),
  };
};
