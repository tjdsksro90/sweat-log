import { describe, expect, it } from "vitest";

import type { WorkoutComment } from "./comment";
import {
  appendOlderComments,
  decodeCommentCursor,
  encodeCommentCursor,
  getOlderCursor,
  INITIAL_OLDER_COMMENTS,
  removeOlderComment,
  sliceComments,
  syncOlderComments,
  toCommentSlice,
} from "./comment-page";

// n번째 댓글: 시각과 id가 n이 클수록 나중이다.
const comment = (n: number): WorkoutComment => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  userId: "10000000-0000-4000-8000-000000000001",
  nickname: "친구",
  body: `댓글 ${n}`,
  createdAt: `2026-11-16T00:${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}.123456+00:00`,
  isMine: false,
});
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => comment(from + index));
const bodies = (comments: WorkoutComment[]) => comments.map((item) => item.body);
const ALL = range(1, 12);

describe("댓글 커서", () => {
  it("작성 시각 문자열을 마이크로초까지 그대로 되돌린다", () => {
    const cursor = { createdAt: "2026-11-14T06:10:00.123456+00:00", id: comment(1).id };
    expect(decodeCommentCursor(encodeCommentCursor(cursor))).toEqual(cursor);
    const demo = { createdAt: "2026-11-14T06:10:00.123Z", id: comment(2).id };
    expect(decodeCommentCursor(encodeCommentCursor(demo))).toEqual(demo);
  });

  it.each([
    ["문자열이 아닌 값", 1],
    ["base64가 아닌 값", "%%%"],
    ["항목 수가 틀린 값", encodeCommentCursor({ createdAt: "2026-11-14T06:10:00Z", id: "x" }).slice(0, 4)],
    ["UUID가 아닌 id", encodeCommentCursor({ createdAt: "2026-11-14T06:10:00Z", id: "abc" })],
    ["없는 날짜", encodeCommentCursor({ createdAt: "2026-02-30T06:10:00Z", id: comment(1).id })],
    ["DB가 받지 못하는 오프셋", encodeCommentCursor({ createdAt: "2026-11-14T06:10:00+16:00", id: comment(1).id })],
    ["쿼리 문법이 섞인 시각", encodeCommentCursor({ createdAt: '2026-11-14T06:10:00Z",id.gt.0', id: comment(1).id })],
  ])("%s는 거부한다", (_, value) => {
    expect(decodeCommentCursor(value)).toBeNull();
  });
});

describe("toCommentSlice", () => {
  it("한 개 더 읽혔으면 오래된 순으로 뒤집어 자르고 가장 오래된 댓글을 다음 커서로 준다", () => {
    const slice = toCommentSlice(range(6, 12).reverse(), 5);
    expect(bodies(slice.comments)).toEqual(bodies(range(8, 12)));
    expect(slice.olderCursor && decodeCommentCursor(slice.olderCursor)).toEqual({
      createdAt: comment(8).createdAt,
      id: comment(8).id,
    });
  });

  it("페이지 크기 이하면 더 볼 댓글이 없다", () => {
    expect(toCommentSlice(range(1, 5).reverse(), 5)).toEqual({ comments: range(1, 5), olderCursor: null });
    expect(toCommentSlice([], 5)).toEqual({ comments: [], olderCursor: null });
  });
});

describe("sliceComments", () => {
  it("최신 묶음부터 커서를 따라가면 빠짐없이 겹치지 않고 처음 댓글까지 닿는다", () => {
    const seen: WorkoutComment[] = [];
    let slice = sliceComments(ALL, null, 5);
    seen.unshift(...slice.comments);
    while (slice.olderCursor) {
      slice = sliceComments(ALL, decodeCommentCursor(slice.olderCursor), 5);
      seen.unshift(...slice.comments);
    }
    expect(bodies(seen)).toEqual(bodies(ALL));
  });

  it("같은 시각의 댓글은 id로 나눈다", () => {
    const sameTime = ALL.map((item) => ({ ...item, createdAt: "2026-11-16T00:00:00Z" }));
    const first = sliceComments(sameTime, null, 5);
    const second = sliceComments(sameTime, decodeCommentCursor(first.olderCursor ?? ""), 5);
    expect(bodies(first.comments)).toEqual(bodies(range(8, 12)));
    expect(bodies(second.comments)).toEqual(bodies(range(3, 7)));
  });
});

describe("이전 댓글 상태", () => {
  const latest = sliceComments(ALL, null, 5); // 8~12

  it("펼치기 전에는 최신 묶음의 커서를 쓰고, 펼친 뒤에는 불러온 묶음의 커서를 쓴다", () => {
    expect(getOlderCursor(INITIAL_OLDER_COMMENTS, latest)).toBe(latest.olderCursor);
    const older = appendOlderComments(INITIAL_OLDER_COMMENTS, sliceComments(ALL, comment(8), 5)); // 3~7
    expect(bodies(older.comments)).toEqual(bodies(range(3, 7)));
    expect(getOlderCursor(older, latest)).toBe(older.cursor);
    const all = appendOlderComments(older, sliceComments(ALL, comment(3), 5)); // 1~2
    expect(bodies(all.comments)).toEqual(bodies(range(1, 7)));
    expect(getOlderCursor(all, latest)).toBeNull();
  });

  it("새 댓글에 밀려난 최신 묶음의 댓글을 이전 댓글로 옮겨 목록 중간이 비지 않게 한다", () => {
    const older = appendOlderComments(INITIAL_OLDER_COMMENTS, sliceComments(ALL, comment(8), 5)); // 3~7
    const withNew = [...ALL, comment(13), comment(14)];
    const next = sliceComments(withNew, null, 5); // 10~14
    const synced = syncOlderComments(older, latest, next);
    expect(bodies([...synced.comments, ...next.comments])).toEqual(bodies(range(3, 14)));
    expect(synced.cursor).toBe(older.cursor);
  });

  it("삭제로 최신 묶음이 뒤로 넓어지면 겹치는 이전 댓글을 뺀다", () => {
    const older = appendOlderComments(INITIAL_OLDER_COMMENTS, sliceComments(ALL, comment(8), 5)); // 3~7
    const rest = ALL.filter((item) => item.id !== comment(10).id);
    const next = sliceComments(rest, null, 5); // 7,8,9,11,12
    const synced = syncOlderComments(older, latest, next);
    expect(bodies([...synced.comments, ...next.comments])).toEqual(bodies(rest.slice(2)));
  });

  it("최신 묶음이 전부를 담게 되면 이전 댓글을 비우고, 펼치기 전에는 아무것도 옮기지 않는다", () => {
    const older = appendOlderComments(INITIAL_OLDER_COMMENTS, sliceComments(ALL, comment(8), 5));
    expect(syncOlderComments(older, latest, sliceComments(range(1, 4), null, 5))).toEqual(INITIAL_OLDER_COMMENTS);
    const next = sliceComments([...ALL, comment(13)], null, 5);
    expect(syncOlderComments(INITIAL_OLDER_COMMENTS, latest, next)).toBe(INITIAL_OLDER_COMMENTS);
  });

  it("삭제한 이전 댓글은 목록에서 뺀다", () => {
    const older = appendOlderComments(INITIAL_OLDER_COMMENTS, sliceComments(ALL, comment(8), 5));
    expect(bodies(removeOlderComment(older, comment(5).id).comments)).toEqual(["댓글 3", "댓글 4", "댓글 6", "댓글 7"]);
  });
});
