import { describe, expect, it } from "vitest";

import { toWorkoutFormCrews, withExistingCompanions } from "@/widgets/workout-form/model/crews";

describe("toWorkoutFormCrews", () => {
  it("함께한 친구 후보에서 나를 빼고, 닉네임이 없으면 대신 이름을 붙인다", () => {
    const crews = toWorkoutFormCrews(
      [
        {
          id: "crew-1",
          inviteCode: "ABC123",
          members: [
            { isOwner: true, nickname: "민수", userId: "me" },
            { isOwner: false, nickname: "지은", userId: "friend-1" },
            { isOwner: false, nickname: null, userId: "friend-2" },
          ],
          name: "새벽러닝",
          ownerId: "me",
        },
      ],
      "me",
    );

    expect(crews).toEqual([
      {
        id: "crew-1",
        members: [
          { nickname: "지은", userId: "friend-1" },
          { nickname: "이름 없는 친구", userId: "friend-2" },
        ],
        name: "새벽러닝",
      },
    ]);
  });
});

describe("withExistingCompanions", () => {
  it("크루 구성원 뒤에 크루 밖의 기존 동행자를 겹치지 않게 붙인다", () => {
    const jieun = { nickname: "지은", userId: "friend-1" };
    const left = { nickname: "알 수 없음", userId: "left-1" };

    expect(withExistingCompanions([jieun], [jieun, left])).toEqual([jieun, left]);
    expect(withExistingCompanions([jieun], [])).toEqual([jieun]);
  });
});
