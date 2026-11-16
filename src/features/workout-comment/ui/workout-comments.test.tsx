import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { WorkoutComment } from "../model/comment";
import type { CommentAction } from "../model/comment-form";
import type { LoadOlderComments, WorkoutCommentPage } from "../model/comment-page";
import { WorkoutComments } from "./workout-comments";

const WORKOUT_ID = "a1234567-abcd-1234-abcd-123456789abc";

const renderComments = async (
  loadComments: (workoutId: string) => Promise<WorkoutCommentPage>,
  createAction: CommentAction = vi.fn<CommentAction>(),
) =>
  render(
    await WorkoutComments({
      workoutId: WORKOUT_ID,
      loadComments,
      loadOlder: vi.fn<LoadOlderComments>(),
      createAction,
      deleteAction: vi.fn<CommentAction>(),
    }),
  );

describe("WorkoutComments 조회 연결", () => {
  it("넘겨받은 조회 함수로 기록의 댓글을 불러와 보여 준다", async () => {
    const comment: WorkoutComment = {
      id: "c1",
      userId: "u1",
      nickname: "친구",
      body: "멋져요",
      createdAt: new Date().toISOString(),
      isMine: false,
    };
    const loadComments = vi.fn(async () => ({ comments: [comment], olderCursor: null, total: 1 }));
    await renderComments(loadComments);
    expect(loadComments).toHaveBeenCalledWith(WORKOUT_ID);
    expect(screen.getByText("멋져요")).toBeInTheDocument();
  });

  it("넘겨받은 작성 함수로 댓글을 보낸다", async () => {
    const user = userEvent.setup();
    const createAction = vi.fn<CommentAction>(async () => ({ error: null, success: true }));
    await renderComments(async () => ({ comments: [], olderCursor: null, total: 0 }), createAction);
    await user.type(screen.getByRole("textbox", { name: "댓글 남기기" }), "응원해요");
    await user.click(screen.getByRole("button", { name: "댓글 남기기" }));
    expect(createAction.mock.calls[0][1].get("workoutId")).toBe(WORKOUT_ID);
  });

  it("조회 실패는 화면 안에서 안내한다", async () => {
    await renderComments(async () => {
      throw new Error("조회 실패");
    });
    expect(screen.getByRole("alert")).toHaveTextContent("댓글을 불러오지 못했어요.");
  });

  it("로그인 이동 같은 Next.js 흐름은 삼키지 않는다", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    await expect(
      WorkoutComments({
        workoutId: WORKOUT_ID,
        loadComments: async () => {
          throw redirect;
        },
        loadOlder: vi.fn<LoadOlderComments>(),
        createAction: vi.fn<CommentAction>(),
        deleteAction: vi.fn<CommentAction>(),
      }),
    ).rejects.toBe(redirect);
  });
});
