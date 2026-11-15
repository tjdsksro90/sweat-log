import { describe, expect, it } from "vitest";

import { getListHref, parseListState, shiftMonth } from "./filters";

describe("목록 URL", () => {
  it("잘못된 검색 조건은 기본값으로 바꾼다", () => {
    expect(parseListState({ kind: ["run"], month: "2026-13", pages: "-1", view: "unknown" }, "2026-11")).toEqual({
      kind: "all",
      month: "2026-11",
      pages: 1,
      view: "timeline",
    });
  });
  it("더 보기와 필터 전환에 필요한 조건을 보존한다", () => {
    const state = parseListState({ kind: "run", view: "calendar", month: "2026-12", pages: "2" }, "2026-11");
    const url = new URL(getListHref(state, { kind: "strength", pages: 1 }), "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      kind: "strength",
      view: "calendar",
      month: "2026-12",
      pages: "1",
    });
  });
  it("이전 달과 다음 달은 연도를 넘는다", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});
