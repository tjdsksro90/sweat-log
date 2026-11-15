import { describe, expect, it } from "vitest";

import { isCommentResourceId, validateCommentBody } from "@/features/workout-comment/model/comment-form";

describe("댓글 입력 검증", () => {
  it("댓글은 양끝 공백을 제외한 1~500자만 받는다", () => {
    for (const body of [" 힘내요! ", "가".repeat(500), "💪".repeat(500), "함께\n달려요"])
      expect(validateCommentBody(body)).toBeNull();
    for (const body of [null, new File([], "body"), "", " \n\t ", "가".repeat(501), "💪".repeat(501)])
      expect(validateCommentBody(body)).toBeTruthy();
  });

  it("댓글과 기록 식별자는 UUID만 받는다", () => {
    expect(isCommentResourceId("A1234567-ABCD-1234-ABCD-123456789ABC")).toBe(true);
    for (const id of [null, "", "../workouts", "a1234567-abcd-1234-abcd-123456789abc?x=1"])
      expect(isCommentResourceId(id)).toBe(false);
  });
});
