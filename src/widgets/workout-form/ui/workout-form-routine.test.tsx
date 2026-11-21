import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import type { Routine } from "@/entities/routine/model/routine";
import type { RecentStrengthWorkout } from "@/entities/workout/model/recent-strength";
import { createWorkoutFormValues, type WorkoutFormValues } from "@/features/workout/model/workout-form";
import type { UpdateRoutineExercisesAction } from "@/widgets/workout-form/model/types";
import { WorkoutForm } from "@/widgets/workout-form/ui/workout-form";

const router = { back: vi.fn(), push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const TODAY = "2026-11-21";
const LEGS: Routine = {
  exercises: [{ name: "스쿼트", sets: [{ reps: 10, weightKg: 60 }] }],
  id: "00000000-0000-4000-8000-0000000000a1",
  name: "하체 데이",
  updatedAt: "2026-11-16T00:00:00Z",
};
const PUSH: Routine = {
  exercises: [{ name: "벤치프레스", sets: [{ reps: 8, weightKg: 50 }] }],
  id: "00000000-0000-4000-8000-0000000000a2",
  name: "상체 밀기",
  updatedAt: "2026-11-15T00:00:00Z",
};
const RECENT: RecentStrengthWorkout = {
  exercises: [{ name: "데드리프트", sets: [{ reps: 5, weightKg: 100 }] }],
  id: "00000000-0000-4000-8000-0000000000b1",
  title: "등 데이",
  workoutDate: "2026-11-19",
};

const QUESTION = "‘하체 데이’ 루틴을 이 내용으로 업데이트할까요?";

const renderForm = ({
  initialValues = createWorkoutFormValues(TODAY, "strength"),
  updateRoutine = vi.fn<UpdateRoutineExercisesAction>().mockResolvedValue({ id: LEGS.id, ok: true }),
}: {
  initialValues?: WorkoutFormValues;
  updateRoutine?: Mock<UpdateRoutineExercisesAction>;
} = {}) => {
  const saveWorkout = vi.fn().mockResolvedValue({ id: "saved-id", ok: true });
  render(
    <WorkoutForm
      title="기록하기"
      initialValues={initialValues}
      crews={[]}
      today={TODAY}
      closeHref="/workouts"
      saveWorkout={saveWorkout}
      routines={[LEGS, PUSH]}
      recentWorkouts={[RECENT]}
      updateRoutine={updateRoutine}
    />,
  );
  return { saveWorkout, updateRoutine, user: userEvent.setup() };
};

type User = ReturnType<typeof userEvent.setup>;

const goToDetail = (user: User) => user.click(screen.getByRole("button", { name: "다음" }));

// 지금 적은 게 없을 때만 바로 채운다. 이미 적었으면 덮어쓰기를 고른다.
const pick = async (user: User, trigger: string, item: RegExp) => {
  await user.click(screen.getByRole("button", { name: trigger }));
  await user.click(await screen.findByRole("button", { name: item }));
  const overwrite = screen.queryByRole("button", { name: "덮어쓰기" });
  if (overwrite) await user.click(overwrite);
};

const saveFromDetail = async (user: User) => {
  await user.click(screen.getByRole("button", { name: "다음" }));
  await user.click(screen.getByRole("button", { name: "기록 저장" }));
};

describe("루틴으로 운동한 뒤 루틴 갱신 제안", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("루틴을 불러왔으면 저장 뒤 묻고, 동의하면 저장한 종목·세트로 루틴을 바꾼 뒤 상세로 간다", async () => {
    const { saveWorkout, updateRoutine, user } = renderForm();
    await goToDetail(user);
    await pick(user, "루틴 불러오기", /하체 데이/);

    // 바뀌었는지와 상관없이 묻는다. 무게를 고쳐 본다.
    const weight = screen.getByLabelText("1번째 종목 1세트 무게 (kg)");
    await user.clear(weight);
    await user.type(weight, "62.5");
    await saveFromDetail(user);

    expect(saveWorkout).toHaveBeenCalledOnce();
    const dialog = await screen.findByRole("dialog", { name: QUESTION });
    // 묻는 동안은 이동하지 않는다.
    expect(router.replace).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "루틴 업데이트" }));

    expect(updateRoutine).toHaveBeenCalledWith(LEGS.id, [{ name: "스쿼트", sets: [{ reps: 10, weightKg: 62.5 }] }]);
    expect(router.replace).toHaveBeenCalledWith("/workouts/saved-id");
  });

  it("거절하면 루틴은 그대로 두고 상세로 간다", async () => {
    const { updateRoutine, user } = renderForm();
    await goToDetail(user);
    await pick(user, "루틴 불러오기", /하체 데이/);
    await saveFromDetail(user);

    await user.click(await screen.findByRole("button", { name: "그대로 두기" }));
    expect(updateRoutine).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/workouts/saved-id");
  });

  it("불러오지 않았으면 묻지 않는다", async () => {
    const { user } = renderForm();
    await goToDetail(user);
    await user.type(screen.getByLabelText("1번째 종목"), "스쿼트");
    await user.type(screen.getByLabelText("1번째 종목 1세트 횟수"), "10");
    await saveFromDetail(user);

    expect(router.replace).toHaveBeenCalledWith("/workouts/saved-id");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("최근 기록으로 채웠으면 루틴을 불러온 게 아니라 묻지 않는다", async () => {
    const { updateRoutine, user } = renderForm();
    await goToDetail(user);
    // 루틴을 불러왔다가 최근 기록으로 덮어써도 마지막 불러오기를 따른다.
    await pick(user, "루틴 불러오기", /하체 데이/);
    await pick(user, "최근 기록 불러오기", /등 데이/);
    await saveFromDetail(user);

    expect(router.replace).toHaveBeenCalledWith("/workouts/saved-id");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(updateRoutine).not.toHaveBeenCalled();
  });

  it("여러 루틴을 차례로 불러왔으면 마지막 루틴만 묻는다", async () => {
    const { updateRoutine, user } = renderForm();
    await goToDetail(user);
    await pick(user, "루틴 불러오기", /하체 데이/);
    await pick(user, "루틴 불러오기", /상체 밀기/);
    await saveFromDetail(user);

    const dialog = await screen.findByRole("dialog", { name: "‘상체 밀기’ 루틴을 이 내용으로 업데이트할까요?" });
    await user.click(within(dialog).getByRole("button", { name: "루틴 업데이트" }));
    expect(updateRoutine).toHaveBeenCalledWith(PUSH.id, PUSH.exercises);
  });

  it("수정 화면에서 루틴을 불러오지 않았으면 묻지 않는다", async () => {
    const edited: WorkoutFormValues = {
      ...createWorkoutFormValues(TODAY, "strength"),
      exercises: [{ key: "e1", name: "레그프레스", sets: [{ key: "s1", reps: "10", weightKg: "100" }] }],
      id: "00000000-0000-4000-8000-0000000000c1",
    };
    const first = renderForm({ initialValues: edited });
    await goToDetail(first.user);
    await saveFromDetail(first.user);
    expect(router.replace).toHaveBeenCalledWith("/workouts/saved-id");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("수정 화면에서 루틴을 불러오면 저장 뒤 묻는다", async () => {
    const edited: WorkoutFormValues = {
      ...createWorkoutFormValues(TODAY, "strength"),
      exercises: [{ key: "e1", name: "레그프레스", sets: [{ key: "s1", reps: "10", weightKg: "100" }] }],
      id: "00000000-0000-4000-8000-0000000000c1",
    };
    const { user } = renderForm({ initialValues: edited });
    await goToDetail(user);
    await pick(user, "루틴 불러오기", /하체 데이/);
    await saveFromDetail(user);
    expect(await screen.findByRole("dialog", { name: QUESTION })).toBeDefined();
  });

  it("루틴이 그사이 지워져 갱신이 실패하면 짧게 알리고, 확인하면 상세로 간다", async () => {
    const updateRoutine = vi
      .fn<UpdateRoutineExercisesAction>()
      .mockResolvedValue({ error: "루틴을 찾지 못했어요. 이미 지웠는지 확인해 주세요.", ok: false });
    const { user } = renderForm({ updateRoutine });
    await goToDetail(user);
    await pick(user, "루틴 불러오기", /하체 데이/);
    await saveFromDetail(user);
    await user.click(await screen.findByRole("button", { name: "루틴 업데이트" }));

    const notice = await screen.findByRole("dialog", { name: "루틴은 그대로예요" });
    expect(notice).toHaveTextContent("루틴을 찾지 못했어요. 이미 지웠는지 확인해 주세요. 기록은 저장했어요.");
    expect(router.replace).not.toHaveBeenCalled();
    await user.click(within(notice).getByRole("button", { name: "확인" }));
    expect(router.replace).toHaveBeenCalledWith("/workouts/saved-id");
  });
});
