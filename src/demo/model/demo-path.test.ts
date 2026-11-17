import { describe, expect, it } from "vitest";

import { matchDemoRoute, normalizeAppPath, parseAppPath, readAppPath, toDemoHref } from "./demo-path";

describe("toDemoHref / readAppPath", () => {
  it("홈은 쿼리 없이 체험 앱 주소로 둔다", () => {
    expect(toDemoHref("/")).toBe("/demo/app");
    expect(readAppPath("")).toBe("/");
  });

  it.each([
    "/workouts/30000000-0000-4000-8000-000000000001",
    "/workouts?view=calendar&kind=run&month=2026-11",
    "/workouts?view=timeline&kind=all&month=2026-11&cursor=eyJ3IjoiMjAyNi0xMS0wMSJ9",
    "/crews/20000000-0000-4000-8000-000000000001?cursor=abc%3D#crew-feed-title",
    "/workouts/new?kind=strength",
  ])("실제 경로 %s를 쿼리와 해시까지 그대로 왕복한다", (path) => {
    const href = toDemoHref(path);
    expect(href.startsWith("/demo/app?path=")).toBe(true);
    expect(href).not.toContain("#");
    expect(readAppPath(new URL(href, "http://localhost").search)).toBe(path);
  });

  it.each([
    "https://example.com",
    "//example.com/x",
    "/\\example.com",
    "workouts",
    "",
  ])("앱 밖 주소 %s는 홈으로 바꾼다", (path) => {
    expect(normalizeAppPath(path)).toBe("/");
    expect(readAppPath(`?path=${encodeURIComponent(path)}`)).toBe("/");
  });
});

describe("matchDemoRoute", () => {
  it.each([
    ["/", { name: "home" }],
    ["/workouts", { name: "workouts" }],
    ["/workouts/new", { name: "workout-new" }],
    ["/workouts/abc", { name: "workout-detail", workoutId: "abc" }],
    ["/workouts/abc/edit", { name: "workout-edit", workoutId: "abc" }],
    ["/crews", { name: "crews" }],
    ["/crews/c1", { name: "crew-detail", crewId: "c1" }],
    ["/settings", { name: "settings" }],
    ["/settings/routines", { name: "routines" }],
    ["/settings/routines/new", { name: "routine-new" }],
    ["/settings/routines/r1", { name: "routine-edit", routineId: "r1" }],
    ["/workouts/abc/comments", { name: "not-found" }],
    ["/login", { name: "not-found" }],
  ])("%s → %o", (pathname, route) => {
    expect(matchDemoRoute(pathname)).toEqual(route);
  });
});

describe("parseAppPath", () => {
  it("경로·쿼리·해시를 나눠 화면과 검색 조건을 고른다", () => {
    expect(parseAppPath("/workouts?view=calendar&kind=run&kind=other&month=2026-11#top")).toEqual({
      path: "/workouts?view=calendar&kind=run&kind=other&month=2026-11#top",
      pathname: "/workouts",
      searchParams: { view: "calendar", kind: ["run", "other"], month: "2026-11" },
      hash: "top",
      route: { name: "workouts" },
    });
  });

  it("끝의 슬래시는 무시한다", () => {
    expect(parseAppPath("/crews/").route).toEqual({ name: "crews" });
    expect(parseAppPath("/crews/").pathname).toBe("/crews");
  });

  it("잘못된 인코딩은 오류 없이 없는 화면으로 본다", () => {
    expect(parseAppPath("/workouts/%E0%A4%A").route).toEqual({ name: "workout-detail", workoutId: "%E0%A4%A" });
    expect(parseAppPath("/x#%E0%A4%A").hash).toBe("%E0%A4%A");
  });
});
