import { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { SaveUserExerciseResult, UserExercise, UserExerciseInput } from "../model/user-exercise";
import { ExerciseNameInput } from "./exercise-name-input";
import { UserExercisesProvider } from "./user-exercises-provider";

function Form() {
  const [value, setValue] = useState("");
  return (
    <>
      <label htmlFor="exercise">종목 이름</label>
      <ExerciseNameInput id="exercise" value={value} onValueChange={setValue} />
      <button type="button">다음</button>
    </>
  );
}
describe("종목 자동완성", () => {
  it("빈 값에서는 목록을 열지 않고 상태 안내 영역을 유지한다", async () => {
    const user = userEvent.setup();
    render(<Form />);
    const input = screen.getByRole("combobox");
    const status = screen.getByRole("status");
    await user.click(input);
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(status).toBeEmptyDOMElement();
    await user.type(input, "없는종목");
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("그대로");
    await user.clear(input);
    await user.type(input, "   ");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toBeEmptyDOMElement();
  });
  it("목록이 열려 있을 때만 Escape의 기본 동작을 막는다", async () => {
    const user = userEvent.setup();
    render(<Form />);
    const input = screen.getByRole("combobox");
    expect(fireEvent.keyDown(input, { key: "Escape" })).toBe(true);
    await user.type(input, "벤ㅊ");
    expect(fireEvent.keyDown(input, { key: "Escape" })).toBe(false);
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(fireEvent.keyDown(input, { key: "Escape" })).toBe(true);
    await user.clear(input);
    await user.type(input, "없는종목");
    expect(fireEvent.keyDown(input, { key: "Escape" })).toBe(true);
  });
  it("초성 검색, 방향키 이동과 Enter 선택을 입력 포커스 안에서 처리한다", async () => {
    const user = userEvent.setup();
    render(<Form />);
    const input = screen.getByRole("combobox", { name: "종목 이름" });
    await user.type(input, "ㅂㅊ");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}");
    const option = screen.getAllByRole("option")[0];
    expect(input).toHaveAttribute("aria-activedescendant", option.id);
    expect(option).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}");
    expect(input).toHaveValue("벤치프레스");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });
  it("미등록 이름과 Escape·Tab은 입력값을 강제로 바꾸지 않는다", async () => {
    const user = userEvent.setup();
    render(<Form />);
    const input = screen.getByRole("combobox");
    await user.type(input, "내 종목");
    expect(screen.getByRole("status")).toHaveTextContent("그대로");
    await user.keyboard("{Escape}");
    expect(input).toHaveValue("내 종목");
    await user.clear(input);
    await user.type(input, "풀");
    await user.keyboard("{ArrowDown}{Tab}");
    expect(input).toHaveValue("풀");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toHaveFocus();
  });
  it("마우스 선택과 한글 조합 중 Enter를 지원한다", async () => {
    const user = userEvent.setup();
    render(<Form />);
    const input = screen.getByRole("combobox");
    await user.type(input, "풀");
    await user.keyboard("{ArrowDown}");
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(input).toHaveValue("풀");
    await user.click(screen.getByRole("option", { name: "풀업, 등, 맨몸" }));
    expect(input).toHaveValue("풀업");
    expect(input).toHaveFocus();
  });
});

function FormWithMyExercises({
  initial = [],
  save = vi.fn(),
}: {
  initial?: UserExercise[];
  save?: (input: UserExerciseInput) => Promise<SaveUserExerciseResult>;
}) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={client}>
      <UserExercisesProvider list={async () => initial} save={save} queryKey={["user-exercises", "me"]}>
        <Form />
      </UserExercisesProvider>
    </QueryClientProvider>
  );
}

const KICKBACK: UserExercise = {
  bodyPart: "팔",
  bodyweight: false,
  id: "00000000-0000-4000-8000-000000000001",
  name: "케이블 킥백",
};

describe("내 종목 추천과 추가", () => {
  it("내 종목을 초성·부위로 찾고 내 종목 표시를 붙인다", async () => {
    const user = userEvent.setup();
    render(<FormWithMyExercises initial={[KICKBACK]} />);
    const input = screen.getByRole("combobox");
    await user.type(input, "ㅋㅇㅂㅋ");
    expect(await screen.findByRole("option", { name: "케이블 킥백, 팔, 내 종목" })).toHaveTextContent("내 종목");
    // 초성만 적은 검색어는 새 종목으로 권하지 않는다
    expect(screen.queryByRole("option", { name: /새 종목으로 추가/ })).not.toBeInTheDocument();
    await user.clear(input);
    await user.type(input, "팔");
    expect(screen.getByRole("option", { name: "케이블 킥백, 팔, 내 종목" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /새 종목으로 추가/ })).not.toBeInTheDocument();
  });

  it("없는 이름은 맨 아래 추가 항목에서 부위를 골라 내 종목으로 등록하고 입력칸에 넣는다", async () => {
    const user = userEvent.setup();
    const save = vi.fn(
      async (input: UserExerciseInput): Promise<SaveUserExerciseResult> => ({
        exercise: { bodyPart: input.bodyPart ?? "팔", bodyweight: input.bodyweight, id: KICKBACK.id, name: input.name },
        ok: true,
      }),
    );
    render(<FormWithMyExercises save={save} />);
    const input = screen.getByRole("combobox");
    await user.type(input, " 케이블 킥백 ");
    const options = screen.getAllByRole("option");
    const add = options[options.length - 1];
    expect(add).toHaveAccessibleName("‘케이블 킥백’ 새 종목으로 추가");
    expect(screen.getByRole("status")).toHaveTextContent("새 종목으로 추가");

    // 한글 조합 중 Enter는 무시하고, 방향키로 고른 뒤 Enter로 연다
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", add.id);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog", { name: "새 종목 추가" });
    expect(within(dialog).getByLabelText("종목 이름")).toHaveValue("케이블 킥백");
    await user.click(within(dialog).getByRole("button", { name: "내 종목으로 추가" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("부위를 골라 주세요.");
    expect(save).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "팔" }));
    expect(within(dialog).getByRole("button", { name: "팔" })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(dialog).getByRole("checkbox", { name: /맨몸 운동이에요/ }));
    await user.click(within(dialog).getByRole("button", { name: "내 종목으로 추가" }));

    expect(save).toHaveBeenCalledWith({ bodyPart: "팔", bodyweight: true, id: undefined, name: "케이블 킥백" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(input).toHaveValue("케이블 킥백");

    await user.clear(input);
    await user.type(input, "ㅋㅇㅂ");
    expect(screen.getByRole("option", { name: "케이블 킥백, 팔, 맨몸, 내 종목" })).toBeInTheDocument();
  });

  it("공백을 뺀 이름이 사전 종목과 같으면 만들지 않고 그 종목을 고르게 한다", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(<FormWithMyExercises save={save} />);
    const input = screen.getByRole("combobox");
    await user.type(input, "킥백");
    await user.click(screen.getByRole("option", { name: "‘킥백’ 새 종목으로 추가" }));
    const dialog = await screen.findByRole("dialog");
    const name = within(dialog).getByLabelText("종목 이름");
    await user.clear(name);
    await user.type(name, "풀 업");
    await user.click(within(dialog).getByRole("button", { name: "등" }));
    await user.click(within(dialog).getByRole("button", { name: "내 종목으로 추가" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("‘풀업’은(는) 기본 종목에 있어요.");
    expect(save).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "‘풀업’ 고르기" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(input).toHaveValue("풀업");
  });

  it("서버가 알려 준 중복(내 다른 종목)도 그 종목을 고르게 한다", async () => {
    const user = userEvent.setup();
    const save = vi.fn(
      async (): Promise<SaveUserExerciseResult> => ({
        duplicate: { ...KICKBACK, userExerciseId: KICKBACK.id },
        error: "같은 이름의 종목이 이미 있어요.",
        ok: false,
      }),
    );
    render(<FormWithMyExercises save={save} />);
    await user.type(screen.getByRole("combobox"), "케이블킥백");
    await user.click(screen.getByRole("option", { name: "‘케이블킥백’ 새 종목으로 추가" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "팔" }));
    await user.click(within(dialog).getByRole("button", { name: "내 종목으로 추가" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("‘케이블 킥백’이(가) 이미 내 종목에 있어요.");
    await user.click(within(dialog).getByRole("button", { name: "‘케이블 킥백’ 고르기" }));
    expect(screen.getByRole("combobox")).toHaveValue("케이블 킥백");
  });
});

describe("내 종목 캐시", () => {
  it("같은 탭(같은 QueryClient)에서 사용자가 바뀌면 앞사람 종목을 추천·중복 판단에 쓰지 않는다", async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const listB = vi.fn(() => new Promise<UserExercise[]>(() => {}));
    const Tree = ({ userId, list }: { userId: string; list: () => Promise<UserExercise[]> }) => (
      <QueryClientProvider client={client}>
        <UserExercisesProvider list={list} save={vi.fn()} queryKey={["user-exercises", userId]}>
          <Form />
        </UserExercisesProvider>
      </QueryClientProvider>
    );

    const { unmount } = render(<Tree userId="a" list={async () => [KICKBACK]} />);
    await user.type(screen.getByRole("combobox"), "킥백");
    expect(await screen.findByRole("option", { name: "케이블 킥백, 팔, 내 종목" })).toBeInTheDocument();
    unmount();

    // 로그아웃은 캐시를 비우지 않는다. B는 A의 캐시를 보지 않고 자기 목록을 새로 읽는다.
    render(<Tree userId="b" list={listB} />);
    await user.type(screen.getByRole("combobox"), "킥백");
    await waitFor(() => expect(listB).toHaveBeenCalled());
    expect(screen.queryByRole("option", { name: /내 종목/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "‘킥백’ 새 종목으로 추가" })).toBeInTheDocument();
  });
});
