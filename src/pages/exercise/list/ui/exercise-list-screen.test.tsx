import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { SaveUserExerciseResult, UserExercise, UserExerciseInput } from "@/entities/exercise/model/user-exercise";

import { ExerciseListScreen } from "./exercise-list-screen";

const KICKBACK: UserExercise = {
  bodyPart: "팔",
  bodyweight: false,
  id: "00000000-0000-4000-8000-000000000001",
  name: "케이블 킥백",
};

const saved = vi.fn(
  async (input: UserExerciseInput): Promise<SaveUserExerciseResult> => ({
    exercise: {
      bodyPart: input.bodyPart ?? "팔",
      bodyweight: input.bodyweight,
      id: input.id ?? KICKBACK.id,
      name: input.name,
    },
    ok: true,
  }),
);

describe("내 종목 관리", () => {
  it("기록에만 있는 이름은 사전·내 종목을 빼고 보여 주고, 부위만 골라 등록한다", async () => {
    const user = userEvent.setup();
    const save = vi.fn(saved);
    render(
      <ExerciseListScreen
        exercises={[KICKBACK]}
        recordedNames={[
          { name: "스쿼트", workoutCount: 4 },
          { name: "케이블킥백", workoutCount: 2 },
          { name: "드래곤 플래그", workoutCount: 1 },
        ]}
        saveExercise={save}
        deleteExercise={vi.fn()}
      />,
    );
    const section = screen.getByRole("region", { name: "기록에만 있는 종목" });
    expect(within(section).getAllByRole("listitem")).toHaveLength(1);
    await user.click(within(section).getByRole("button", { name: "드래곤 플래그 내 종목으로 등록" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("종목 이름")).toHaveValue("드래곤 플래그");
    await user.click(within(dialog).getByRole("button", { name: "코어" }));
    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    expect(save).toHaveBeenCalledWith({ bodyPart: "코어", bodyweight: false, id: undefined, name: "드래곤 플래그" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("‘드래곤 플래그’을(를) 등록했어요.")).toBeInTheDocument();
  });

  it("고칠 때 지난 기록은 그대로라는 안내를 보여 주고, 지울 때 한 번 더 묻는다", async () => {
    const user = userEvent.setup();
    const save = vi.fn(saved);
    const remove = vi.fn(async () => ({ ok: true as const }));
    render(
      <ExerciseListScreen exercises={[KICKBACK]} recordedNames={[]} saveExercise={save} deleteExercise={remove} />,
    );
    await user.click(screen.getByRole("button", { name: "케이블 킥백 고치기" }));
    let dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("최고 무게도 따로 모여요");
    const name = within(dialog).getByLabelText("종목 이름");
    await user.clear(name);
    await user.type(name, "케이블 트라이셉스 킥백");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(save).toHaveBeenCalledWith({
      bodyPart: "팔",
      bodyweight: false,
      id: KICKBACK.id,
      name: "케이블 트라이셉스 킥백",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "케이블 킥백 지우기" }));
    dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("지난 기록과 최고 무게는 그대로");
    await user.click(within(dialog).getByRole("button", { name: "지우기" }));
    expect(remove).toHaveBeenCalledWith(KICKBACK.id);
  });
});
