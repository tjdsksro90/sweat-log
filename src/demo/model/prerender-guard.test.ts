import { describe, expect, it } from "vitest";

import { DEMO_STORAGE_KEY } from "../store";
import { createPrerenderGuardScript, DEMO_PRERENDER_ID } from "./prerender-guard";

const TODAY = "2026-11-17";
// 2026-11-17 12:00 KST
const NOON_KST = new Date("2026-11-17T03:00:00Z");

const run = ({
  search = "",
  stored = null,
  now = NOON_KST,
  storageThrows = false,
}: {
  search?: string;
  stored?: string | null;
  now?: Date;
  storageThrows?: boolean;
}) => {
  const appended: { textContent: string }[] = [];
  const document = {
    createElement: () => ({ textContent: "" }),
    head: { appendChild: (node: { textContent: string }) => appended.push(node) },
  };
  const sessionStorage = {
    getItem: (key: string) => {
      if (storageThrows) throw new Error("blocked");
      return key === DEMO_STORAGE_KEY ? stored : null;
    },
  };
  const FixedDate = class extends Date {
    constructor() {
      super(now.getTime());
    }
  };
  new Function("location", "sessionStorage", "document", "Date", createPrerenderGuardScript(TODAY))(
    { search },
    sessionStorage,
    document,
    FixedDate,
  );
  return appended.map((node) => node.textContent);
};

const HIDDEN = [`#${DEMO_PRERENDER_ID}{visibility:hidden}`];

describe("createPrerenderGuardScript", () => {
  it("오늘 처음 들어온 홈이면 미리 그린 홈을 그대로 둔다", () => {
    expect(run({})).toEqual([]);
    expect(run({ search: "?path=%2F" })).toEqual([]);
  });

  it("다른 경로로 들어오면 숨긴다", () => {
    expect(run({ search: "?path=%2Fworkouts" })).toEqual(HIDDEN);
  });

  it("이 탭에 저장된 체험이 있으면 숨긴다", () => {
    expect(run({ stored: "{}" })).toEqual(HIDDEN);
  });

  it("그린 날과 KST 날짜가 다르면 숨긴다", () => {
    expect(run({ now: new Date("2026-11-17T15:00:00Z") })).toEqual(HIDDEN);
  });

  it("저장소를 읽지 못하면 숨긴다", () => {
    expect(run({ storageThrows: true })).toEqual(HIDDEN);
  });
});
