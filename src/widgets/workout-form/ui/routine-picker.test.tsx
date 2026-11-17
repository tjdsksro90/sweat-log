import { useState } from "react";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Routine } from "@/entities/routine/model/routine";
import { createEmptyExercise, type StrengthExerciseFormValues } from "@/features/workout/model/workout-form";

import { StrengthDetail } from "./strength-detail";

const ROUTINE: Routine = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "하체 데이",
  exercises: [
    {
      name: "스쿼트",
      sets: [
        { reps: 10, weightKg: 60 },
        { reps: 8, weightKg: 70 },
      ],
    },
    { name: "런지", sets: [{ reps: 12, weightKg: null }] },
  ],
  updatedAt: "2026-11-16T00:00:00Z",
};

function Harness({ initial, routines }: { initial: StrengthExerciseFormValues[]; routines: Routine[] }) {
  const [exercises, setExercises] = useState(initial);
  return <StrengthDetail exercises={exercises} errors={{}} onChange={setExercises} routines={routines} />;
}

const exerciseNames = () => screen.getAllByRole("combobox").map((input) => (input as HTMLInputElement).value);

const openAndPick = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "루틴 불러오기" }));
  await user.click(await screen.findByRole("button", { name: /하체 데이/ }));
};

describe("루틴 불러오기", () => {
  it("아무것도 적지 않았으면 묻지 않고 루틴으로 채운다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[createEmptyExercise()]} routines={[ROUTINE]} />);

    await openAndPick(user);

    expect(exerciseNames()).toEqual(["스쿼트", "런지"]);
    expect(screen.getByLabelText("1번째 종목 2세트 무게 (kg)")).toHaveValue("70");
    expect(screen.getByLabelText("2번째 종목 1세트 무게 (kg)")).toHaveValue("");
    expect(screen.getByText("‘하체 데이’ 루틴을 불러왔어요. 무게와 횟수는 바로 고칠 수 있어요.")).toBeDefined();
  });

  it("불러온 뒤 무게와 횟수를 평소처럼 고친다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[createEmptyExercise()]} routines={[ROUTINE]} />);
    await openAndPick(user);

    const weight = screen.getByLabelText("1번째 종목 1세트 무게 (kg)");
    await user.clear(weight);
    await user.type(weight, "62.5");
    expect(weight).toHaveValue("62.5");
    expect(ROUTINE.exercises[0].sets[0].weightKg).toBe(60);
  });

  it("이미 적은 종목이 있으면 뒤에 붙이기와 덮어쓰기를 묻는다", async () => {
    const user = userEvent.setup();
    const typed = { ...createEmptyExercise(), name: "벤치프레스" };
    render(<Harness initial={[typed]} routines={[ROUTINE]} />);

    await openAndPick(user);
    const dialog = await screen.findByRole("dialog", { name: "이미 적은 종목이 있어요" });
    await user.click(within(dialog).getByRole("button", { name: "뒤에 붙이기" }));
    expect(exerciseNames()).toEqual(["벤치프레스", "스쿼트", "런지"]);

    await openAndPick(user);
    await user.click(await screen.findByRole("button", { name: "덮어쓰기" }));
    expect(exerciseNames()).toEqual(["스쿼트", "런지"]);
  });

  it("다른 루틴 고르기를 누르면 아무것도 바꾸지 않고 목록으로 돌아간다", async () => {
    const user = userEvent.setup();
    const typed = { ...createEmptyExercise(), name: "벤치프레스" };
    render(<Harness initial={[typed]} routines={[ROUTINE]} />);

    await openAndPick(user);
    await user.click(await screen.findByRole("button", { name: "다른 루틴 고르기" }));
    expect(await screen.findByRole("dialog", { name: "어떤 루틴을 불러올까요?" })).toBeDefined();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(exerciseNames()).toEqual(["벤치프레스"]);
  });

  it("저장한 루틴이 없으면 만드는 곳을 알려 준다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[createEmptyExercise()]} routines={[]} />);
    await user.click(screen.getByRole("button", { name: "루틴 불러오기" }));
    expect(await screen.findByText(/저장한 루틴이 없어요/)).toBeDefined();
  });
});
