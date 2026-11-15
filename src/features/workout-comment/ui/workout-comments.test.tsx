import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getWorkoutComments } from "../api/queries";
import { WorkoutComments } from "./workout-comments";

vi.mock("../api/queries", () => ({ getWorkoutComments: vi.fn() }));
vi.mock("../api/comment-actions", () => ({ createComment: vi.fn(), deleteComment: vi.fn() }));

const WORKOUT_ID = "a1234567-abcd-1234-abcd-123456789abc";

describe("WorkoutComments 조회 연결", () => {
  beforeEach(() => vi.clearAllMocks());

  it("기록 ID로 댓글을 조회해 보여 준다", async () => {
    vi.mocked(getWorkoutComments).mockResolvedValue([
      { id: "c1", userId: "u1", nickname: "친구", body: "멋져요", createdAt: new Date().toISOString(), isMine: false },
    ]);
    render(await WorkoutComments({ workoutId: WORKOUT_ID }));
    expect(getWorkoutComments).toHaveBeenCalledWith(WORKOUT_ID);
    expect(screen.getByText("멋져요")).toBeInTheDocument();
  });

  it("조회 실패는 화면 안에서 안내한다", async () => {
    vi.mocked(getWorkoutComments).mockRejectedValue(new Error("조회 실패"));
    render(await WorkoutComments({ workoutId: WORKOUT_ID }));
    expect(screen.getByRole("alert")).toHaveTextContent("댓글을 불러오지 못했어요.");
  });

  it("로그인 이동 같은 Next.js 흐름은 삼키지 않는다", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    vi.mocked(getWorkoutComments).mockRejectedValue(redirect);
    await expect(WorkoutComments({ workoutId: WORKOUT_ID })).rejects.toBe(redirect);
  });
});
