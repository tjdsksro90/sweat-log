import { describe, expect, it } from "vitest";

import { selectCommentRecipients, selectWorkoutRecipients } from "./recipients";

const ME = "me";

describe("selectWorkoutRecipients", () => {
  it("새 기록을 크루에 공유하면 나를 뺀 크루 구성원에게 알린다", () => {
    const result = selectWorkoutRecipients({
      actorId: ME,
      before: null,
      after: { crewId: "crew-1", companionIds: [] },
      crewMemberIds: [ME, "b", "c"],
    });

    expect(result).toEqual([
      { reason: "crew", userId: "b" },
      { reason: "crew", userId: "c" },
    ]);
  });

  it("동행자로 넣은 크루 구성원은 동행자 알림 하나만 받는다", () => {
    const result = selectWorkoutRecipients({
      actorId: ME,
      before: null,
      after: { crewId: "crew-1", companionIds: ["b"] },
      crewMemberIds: [ME, "b", "c"],
    });

    expect(result).toEqual([
      { reason: "companion", userId: "b" },
      { reason: "crew", userId: "c" },
    ]);
  });

  it("크루에 공유하지 않은 기록은 동행자에게만 알린다", () => {
    const result = selectWorkoutRecipients({
      actorId: ME,
      before: null,
      after: { crewId: null, companionIds: ["b"] },
      crewMemberIds: [],
    });

    expect(result).toEqual([{ reason: "companion", userId: "b" }]);
  });

  it("동행자 목록에 내가 들어 있어도 나에게는 보내지 않는다", () => {
    const result = selectWorkoutRecipients({
      actorId: ME,
      before: null,
      after: { crewId: null, companionIds: [ME] },
      crewMemberIds: [],
    });

    expect(result).toEqual([]);
  });

  it("나만 있는 크루에 공유하면 아무에게도 보내지 않는다", () => {
    const result = selectWorkoutRecipients({
      actorId: ME,
      before: null,
      after: { crewId: "crew-1", companionIds: [] },
      crewMemberIds: [ME],
    });

    expect(result).toEqual([]);
  });

  it("수정할 때는 새로 추가한 동행자에게만 알린다", () => {
    const result = selectWorkoutRecipients({
      actorId: ME,
      before: { crewId: null, companionIds: ["b"] },
      after: { crewId: null, companionIds: ["b", "c"] },
      crewMemberIds: [],
    });

    expect(result).toEqual([{ reason: "companion", userId: "c" }]);
  });

  it("같은 크루에 공유된 기록을 고치면 크루에 다시 알리지 않는다", () => {
    const result = selectWorkoutRecipients({
      actorId: ME,
      before: { crewId: "crew-1", companionIds: [] },
      after: { crewId: "crew-1", companionIds: [] },
      crewMemberIds: [ME, "b"],
    });

    expect(result).toEqual([]);
  });

  it("수정하며 다른 크루로 공유하면 새 크루에 알리되 원래 동행자는 뺀다", () => {
    const result = selectWorkoutRecipients({
      actorId: ME,
      before: { crewId: "crew-1", companionIds: ["b"] },
      after: { crewId: "crew-2", companionIds: ["b"] },
      crewMemberIds: [ME, "b", "d"],
    });

    expect(result).toEqual([{ reason: "crew", userId: "d" }]);
  });

  it("공유를 끈 수정은 아무에게도 알리지 않는다", () => {
    const result = selectWorkoutRecipients({
      actorId: ME,
      before: { crewId: "crew-1", companionIds: [] },
      after: { crewId: null, companionIds: [] },
      crewMemberIds: [],
    });

    expect(result).toEqual([]);
  });
});

describe("selectCommentRecipients", () => {
  it("남의 기록에 댓글을 달면 작성자에게 알린다", () => {
    expect(selectCommentRecipients({ actorId: ME, authorId: "b" })).toEqual(["b"]);
  });

  it("내 기록에 내가 단 댓글은 알리지 않는다", () => {
    expect(selectCommentRecipients({ actorId: ME, authorId: ME })).toEqual([]);
  });
});
