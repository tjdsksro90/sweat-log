import { describe, expect, it, vi } from "vitest";

import { INITIAL_COMMENT_FORM_STATE } from "@/features/workout-comment/model/comment-form";

import { DEMO_CREW } from "./sample-data";
import * as store from "./store";

describe("공유 데모 저장소의 서버 접근 차단", () => {
  it("서버에서는 모든 공유 조회가 거부된다", async () => {
    expect(typeof window).toBe("undefined");
    for (const read of [
      () => store.getWorkoutPage(),
      () => store.getWorkoutDetail("missing"),
      () => store.getWeeklySummary(),
      () => store.getRunningStats(),
      () => store.getMyCrews(),
      () => store.getCrew(DEMO_CREW.id),
      () => store.getWorkoutFormCrews(),
      () => store.getWorkoutComments("missing"),
    ])
      await expect(read()).rejects.toThrow("브라우저에서만");
  });

  it("서버에서는 공유 쓰기와 reset도 거부된다", async () => {
    await expect(
      store.saveWorkout({
        kind: "other",
        workoutDate: "2026-11-16",
        title: null,
        memo: null,
        placeName: null,
        crewId: null,
        companionIds: [],
        durationSeconds: 1200,
        run: null,
        exercises: [],
      }),
    ).rejects.toThrow("브라우저에서만");
    await expect(store.deleteWorkout("missing")).rejects.toThrow("브라우저에서만");
    await expect(store.createComment(INITIAL_COMMENT_FORM_STATE, new FormData())).rejects.toThrow("브라우저에서만");
    await expect(store.deleteComment(INITIAL_COMMENT_FORM_STATE, new FormData())).rejects.toThrow("브라우저에서만");
    expect(() => store.reset()).toThrow("브라우저에서만");
  });

  it("독립 메모리 인스턴스는 서버에서도 동작한다", async () => {
    const isolated = store.createDemoStore({ storage: () => null });
    expect((await isolated.getWorkoutPage()).items.length).toBeGreaterThan(0);
    expect(() => isolated.reset()).not.toThrow();
  });

  it("브라우저에서는 storage 접근 실패 후에도 공유 저장소가 동작한다", async () => {
    vi.stubGlobal("window", {
      get sessionStorage() {
        throw new Error("SecurityError");
      },
    });
    try {
      expect((await store.getWorkoutPage()).items.length).toBeGreaterThan(0);
      expect(() => store.reset()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
    await expect(store.getWorkoutPage()).rejects.toThrow("브라우저에서만");
  });
});
