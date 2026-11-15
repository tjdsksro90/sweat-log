import { describe, expect, it } from "vitest";

import { getListHref, parseListState, shiftMonth } from "./filters";

describe("목록 URL", () => {
  it("잘못된 검색 조건은 기본값으로 바꾼다", () => {
    expect(
      parseListState({ kind: ["run"], month: "2026-13", cursor: ["invalid"], view: "unknown" }, "2026-11"),
    ).toEqual({
      kind: "all",
      month: "2026-11",
      cursor: undefined,
      view: "timeline",
    });
  });
  it("더 보기와 필터 전환에 필요한 조건을 보존한다", () => {
    const state = parseListState(
      { kind: "run", view: "calendar", month: "2026-12", cursor: "opaque+cursor=" },
      "2026-11",
    );
    expect(new URL(getListHref(state), "http://localhost").searchParams.get("cursor")).toBe("opaque+cursor=");
    const url = new URL(getListHref(state, { kind: "strength", cursor: undefined }), "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      kind: "strength",
      view: "calendar",
      month: "2026-12",
    });
  });
  it("이전 달과 다음 달은 연도를 넘는다", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});
