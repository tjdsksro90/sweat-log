import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { WorkoutComment } from "../model/comment";
import type { CommentFormState } from "../model/comment-form";
import type { LoadOlderComments, WorkoutCommentPage } from "../model/comment-page";
import { WorkoutCommentsView } from "./workout-comments-view";

const WORKOUT_ID = "a1234567-abcd-1234-abcd-123456789abc";
const NOW = new Date("2026-11-16T12:00:00+09:00");
const COMMENTS: WorkoutComment[] = [
  {
    id: "comment-1",
    userId: "friend",
    nickname: "아주아주긴닉네임을가진러닝크루의친구아주아주긴닉네임",
    body: "오늘도 멋져요!\n다음엔 같이 뛰어요",
    createdAt: "2026-11-16T11:55:00+09:00",
    isMine: false,
  },
  {
    id: "comment-2",
    userId: "me",
    nickname: "나",
    body: "고마워요",
    createdAt: "2026-11-15T09:00:00+09:00",
    isMine: true,
  },
  {
    id: "comment-3",
    userId: "gone",
    nickname: null,
    body: "화이팅",
    createdAt: "2026-11-16T11:59:50+09:00",
    isMine: false,
  },
];

type Action = (state: CommentFormState, formData: FormData) => Promise<CommentFormState>;
const okAction = () => vi.fn<Action>(async () => ({ error: null, success: true }));

const toPage = (comments: WorkoutComment[] | null): WorkoutCommentPage | null =>
  comments && { comments, olderCursor: null, total: comments.length };

const renderView = (
  comments: WorkoutComment[] | null | WorkoutCommentPage,
  actions: { create?: Action; remove?: Action; loadOlder?: LoadOlderComments } = {},
) =>
  render(
    <WorkoutCommentsView
      workoutId={WORKOUT_ID}
      page={Array.isArray(comments) || comments === null ? toPage(comments) : comments}
      now={NOW}
      loadOlder={actions.loadOlder ?? vi.fn<LoadOlderComments>()}
      createAction={actions.create ?? okAction()}
      deleteAction={actions.remove ?? okAction()}
    />,
  );

describe("WorkoutCommentsView", () => {
  it("작성자·시간·본문을 보여 주고 내 댓글에만 삭제 버튼을 둔다", () => {
    renderView(COMMENTS);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText(COMMENTS[0].nickname as string)).toBeInTheDocument();
    expect(within(items[0]).getByText("5분 전")).toBeInTheDocument();
    expect(within(items[0]).getByText(/다음엔 같이 뛰어요/)).toBeInTheDocument();
    expect(within(items[0]).queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
    expect(within(items[1]).getByText("11월 15일")).toBeInTheDocument();
    expect(within(items[1]).getByRole("button", { name: "삭제" })).toBeInTheDocument();
    expect(within(items[2]).getByText("알 수 없는 사용자")).toBeInTheDocument();
  });

  it("댓글이 없으면 첫 응원을 안내하고, 불러오기 실패는 따로 알린다", () => {
    const { unmount } = renderView([]);
    expect(screen.getByRole("heading", { name: "아직 댓글이 없어요" })).toBeInTheDocument();
    unmount();
    renderView(null);
    expect(screen.getByRole("alert")).toHaveTextContent("댓글을 불러오지 못했어요.");
    expect(screen.getByRole("textbox", { name: "댓글 남기기" })).toBeInTheDocument();
  });

  it("댓글을 남기면 기록 ID와 함께 보내고 입력을 비운다", async () => {
    const user = userEvent.setup();
    const create = okAction();
    renderView([], { create });
    const textbox = screen.getByRole("textbox", { name: "댓글 남기기" });
    await user.type(textbox, "  힘내요!  ");
    expect(screen.getByText("4/500자")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "댓글 남기기" }));
    await waitFor(() => expect(textbox).toHaveValue(""));
    const formData = create.mock.calls[0][1];
    expect(formData.get("workoutId")).toBe(WORKOUT_ID);
    expect(formData.get("body")).toBe("  힘내요!  ");
  });

  it("빈 댓글은 보내지 않고, 서버 오류에는 쓰던 내용을 남긴다", async () => {
    const user = userEvent.setup();
    const create = vi.fn<Action>(async () => ({ error: "댓글을 작성하지 못했어요.", success: false }));
    renderView([], { create });
    await user.click(screen.getByRole("button", { name: "댓글 남기기" }));
    expect(screen.getByRole("alert")).toHaveTextContent("댓글은 1~500자로 적어 주세요.");
    expect(create).not.toHaveBeenCalled();
    const textbox = screen.getByRole("textbox", { name: "댓글 남기기" });
    await user.type(textbox, "응원해요");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "댓글 남기기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("댓글을 작성하지 못했어요.");
    expect(textbox).toHaveValue("응원해요");
    expect(textbox).toHaveAttribute("aria-invalid", "true");
  });

  it("삭제는 확인한 뒤에만 보내고, 실패하면 시트에 오류를 남긴다", async () => {
    const user = userEvent.setup();
    const remove = vi.fn<Action>(async () => ({ error: "댓글을 삭제하지 못했어요.", success: false }));
    renderView(COMMENTS, { remove });
    await user.click(screen.getByRole("button", { name: "삭제" }));
    await user.click(await screen.findByRole("button", { name: "취소" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "삭제" }));
    await user.click(await screen.findByRole("button", { name: "삭제 확인" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("댓글을 삭제하지 못했어요.");
    expect(remove.mock.calls[0][1].get("commentId")).toBe("comment-2");
    expect(remove.mock.calls[0][1].get("workoutId")).toBe(WORKOUT_ID);
  });

  it("삭제에 성공하면 확인 시트를 닫는다", async () => {
    const user = userEvent.setup();
    renderView(COMMENTS);
    await user.click(screen.getByRole("button", { name: "삭제" }));
    await user.click(await screen.findByRole("button", { name: "삭제 확인" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("전체 개수는 목록과 따로 보여 주고, 이전 댓글을 위쪽에 이어 붙인다", async () => {
    const user = userEvent.setup();
    const older: WorkoutComment = { ...COMMENTS[0], id: "comment-0", body: "가장 오래된 댓글", isMine: true };
    const loadOlder = vi
      .fn<LoadOlderComments>()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, comments: [older], olderCursor: null });
    const remove = okAction();
    renderView({ comments: COMMENTS.slice(0, 1), olderCursor: "cursor-1", total: 1001 }, { loadOlder, remove });
    expect(screen.getByRole("heading", { name: /응원 댓글/ })).toHaveTextContent("1001개");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "이전 댓글 보기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("이전 댓글을 불러오지 못했어요.");
    await user.click(screen.getByRole("button", { name: "이전 댓글 보기" }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    expect(loadOlder).toHaveBeenLastCalledWith(WORKOUT_ID, "cursor-1");
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("가장 오래된 댓글");
    expect(screen.queryByRole("button", { name: "이전 댓글 보기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "삭제" }));
    await user.click(await screen.findByRole("button", { name: "삭제 확인" }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
    expect(remove.mock.calls[0][1].get("commentId")).toBe("comment-0");
  });
});
