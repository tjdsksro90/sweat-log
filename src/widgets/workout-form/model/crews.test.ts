import { describe, expect, it } from "vitest";

import { toWorkoutFormCrews } from "@/widgets/workout-form/model/crews";

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
