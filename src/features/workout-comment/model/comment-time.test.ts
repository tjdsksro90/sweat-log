import { describe, expect, it } from "vitest";

import { formatCommentTime } from "@/features/workout-comment/model/comment-time";

const NOW = new Date("2026-11-16T12:00:00+09:00");

describe("댓글 시간 표시", () => {
  it("하루 안의 댓글은 상대 시간으로 보여 준다", () => {
    expect(formatCommentTime("2026-11-16T11:59:30+09:00", NOW)).toBe("방금 전");
    expect(formatCommentTime("2026-11-16T12:00:30+09:00", NOW)).toBe("방금 전");
    expect(formatCommentTime("2026-11-16T11:55:00+09:00", NOW)).toBe("5분 전");
    expect(formatCommentTime("2026-11-16T09:00:00+09:00", NOW)).toBe("3시간 전");
  });

  it("하루가 지나면 한국 날짜로, 해가 다르면 연도까지 보여 준다", () => {
    // UTC로는 11월 13일이지만 한국 시간으로는 11월 14일이다.
    expect(formatCommentTime("2026-11-13T15:30:00Z", NOW)).toBe("11월 14일");
    expect(formatCommentTime("2025-12-31T23:00:00+09:00", NOW)).toBe("2025년 12월 31일");
  });

  it("읽을 수 없는 시간은 비워 둔다", () => {
    expect(formatCommentTime("not-a-date", NOW)).toBe("");
  });
});
