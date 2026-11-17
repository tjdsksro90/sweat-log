import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ExerciseNameInput } from "./exercise-name-input";

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
