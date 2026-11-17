import { describe, expect, it } from "vitest";

import { buildCommentPayload, buildWorkoutPayload, describeWorkout, type NotifiedWorkout } from "./payload";

const RUN: NotifiedWorkout = { crewName: "새벽러닝", distanceMeters: 5200, id: "w1", kind: "run", title: null };

describe("describeWorkout", () => {
  it("제목이 있으면 제목을 쓴다", () => {
    expect(describeWorkout({ ...RUN, title: " 한강 야간런 " })).toBe("한강 야간런");
  });

  it("제목 없는 러닝은 거리를 붙인다", () => {
    expect(describeWorkout(RUN)).toBe("러닝 5.20km");
  });

  it("제목 없는 헬스·기타는 종류 이름을 쓴다", () => {
    expect(describeWorkout({ ...RUN, distanceMeters: null, kind: "strength" })).toBe("헬스");
    expect(describeWorkout({ ...RUN, distanceMeters: null, kind: "other" })).toBe("운동");
  });
});

describe("buildWorkoutPayload", () => {
  it("크루 구성원에게는 크루 이름과 기록 상세 경로를 보낸다", () => {
    expect(buildWorkoutPayload({ actorNickname: "민수", reason: "crew", workout: RUN })).toEqual({
      body: "민수님이 러닝 5.20km 기록을 공유했어요.",
      tag: "workout-w1",
      title: "새벽러닝 새 기록",
      url: "/workouts/w1",
    });
  });

  it("동행자에게는 함께한 운동 알림을 보낸다", () => {
    const payload = buildWorkoutPayload({ actorNickname: "민수", reason: "companion", workout: RUN });
    expect(payload.title).toBe("함께한 운동");
    expect(payload.body).toBe("민수님이 러닝 5.20km 기록에 나를 함께한 친구로 남겼어요.");
    expect(payload.url).toBe("/workouts/w1");
  });
});

describe("buildCommentPayload", () => {
  it("닉네임 없이 댓글 내용과 기록 경로만 보낸다", () => {
    expect(buildCommentPayload({ body: "  수고했어!\n다음엔 같이 뛰자  ", workoutId: "w1" })).toEqual({
      body: "수고했어! 다음엔 같이 뛰자",
      tag: "comment-w1",
      title: "내 기록에 새 댓글",
      url: "/workouts/w1",
    });
  });

  it("긴 댓글은 80자에서 자른다", () => {
    const payload = buildCommentPayload({ body: "가".repeat(200), workoutId: "w1" });
    expect(payload.body).toBe(`${"가".repeat(80)}…`);
  });
});
