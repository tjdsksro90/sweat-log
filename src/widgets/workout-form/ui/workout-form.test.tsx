import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createWorkoutFormValues } from "@/features/workout/model/workout-form";
import { type AppNavigation, AppNavigationProvider } from "@/shared/lib/app-navigation";
import type { WorkoutFormCrew } from "@/widgets/workout-form/model/types";
import { WorkoutForm } from "@/widgets/workout-form/ui/workout-form";

const router = { back: vi.fn(), push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const TODAY = "2026-11-15";
const CREW: WorkoutFormCrew = {
  id: "00000000-0000-0000-0000-0000000000c1",
  members: [{ nickname: "지은", userId: "00000000-0000-0000-0000-00000000000b" }],
  name: "새벽러닝",
};

const renderForm = (saveWorkout = vi.fn().mockResolvedValue({ id: "new-id", ok: true })) => {
  render(
    <WorkoutForm
      title="기록하기"
      initialValues={createWorkoutFormValues(TODAY)}
      crews={[CREW]}
      today={TODAY}
      closeHref="/workouts"
      saveWorkout={saveWorkout}
    />,
  );
  return { saveWorkout, user: userEvent.setup() };
};

describe("WorkoutForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("단계마다 입력을 확인하고, 마지막에 WorkoutInput으로 저장한다", async () => {
    const { saveWorkout, user } = renderForm();

    await user.click(screen.getByRole("button", { name: "기타" }));
    await user.click(screen.getByRole("button", { name: "다음" }));

    // 기타는 시간을 적어야 넘어간다
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByRole("alert")).toHaveTextContent("운동한 시간을 적어 주세요.");
    await user.type(screen.getByLabelText("시간"), "2");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다음" }));

    await user.type(screen.getByLabelText("제목 (선택)"), "북한산 등산");
    await user.click(screen.getByRole("button", { name: "새벽러닝" }));
    await user.click(screen.getByRole("button", { name: "지은" }));
    await user.click(screen.getByRole("button", { name: "기록 저장" }));

    expect(saveWorkout).toHaveBeenCalledWith({
      companionIds: [CREW.members[0].userId],
      crewId: CREW.id,
      durationSeconds: 7200,
      exercises: [],
      kind: "other",
      memo: null,
      placeName: null,
      run: null,
      title: "북한산 등산",
      workoutDate: TODAY,
    });
    expect(router.replace).toHaveBeenCalledWith("/workouts/new-id");
  });

  it("저장이 실패하면 서버 오류를 보여주고 화면에 머문다", async () => {
    const { user } = renderForm(vi.fn().mockResolvedValue({ error: "잠시 후 다시 시도해 주세요.", ok: false }));

    await user.click(screen.getByRole("button", { name: "기타" }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.type(screen.getByLabelText("분"), "30");
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "기록 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("잠시 후 다시 시도해 주세요.");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("작성 중에 닫으면 확인을 받고, 아무것도 안 적었으면 바로 닫는다", async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole("button", { name: "닫기" }));
    expect(router.push).toHaveBeenCalledWith("/workouts");
    router.push.mockClear();

    await user.click(screen.getByRole("button", { name: "헬스" }));
    await user.click(screen.getByRole("button", { name: "닫기" }));
    expect(router.push).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: "나가기" }));
    expect(router.push).toHaveBeenCalledWith("/workouts");
  });
});

describe("WorkoutForm 수정", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 크루를 나가서 지금 크루 구성원에는 없는 동행자
  const LEFT_COMPANION = { nickname: "알 수 없음", userId: "00000000-0000-0000-0000-00000000000d" };

  const renderEditForm = () => {
    const saveWorkout = vi.fn().mockResolvedValue({ id: "workout-1", ok: true });
    const initial = createWorkoutFormValues(TODAY, "other");
    render(
      <WorkoutForm
        title="기록 수정"
        initialValues={{
          ...initial,
          companionIds: [CREW.members[0].userId, LEFT_COMPANION.userId],
          crewId: CREW.id,
          duration: { ...initial.duration, minutes: "30" },
          id: "workout-1",
        }}
        crews={[CREW]}
        existingCompanions={[{ nickname: "지은", userId: CREW.members[0].userId }, LEFT_COMPANION]}
        today={TODAY}
        closeHref="/workouts/workout-1"
        saveWorkout={saveWorkout}
      />,
    );
    return { saveWorkout, user: userEvent.setup() };
  };

  const goToFinish = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "다음" }));
  };

  it("크루를 나간 동행자도 선택된 채로 보이고, 그대로 저장된다", async () => {
    const { saveWorkout, user } = renderEditForm();
    await goToFinish(user);

    expect(screen.getByRole("button", { name: "알 수 없음" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "기록 저장" }));

    expect(saveWorkout).toHaveBeenCalledWith(
      expect.objectContaining({ companionIds: [CREW.members[0].userId, LEFT_COMPANION.userId] }),
    );
  });

  it("크루를 나간 동행자를 뺄 수 있다", async () => {
    const { saveWorkout, user } = renderEditForm();
    await goToFinish(user);

    await user.click(screen.getByRole("button", { name: "알 수 없음" }));
    await user.click(screen.getByRole("button", { name: "기록 저장" }));

    expect(saveWorkout).toHaveBeenCalledWith(expect.objectContaining({ companionIds: [CREW.members[0].userId] }));
  });
});

describe("WorkoutForm 이동 주입", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const navigation = (): AppNavigation => ({
    pathname: "/workouts/new",
    push: vi.fn(),
    replace: vi.fn(),
    toHref: (path) => `/demo/app?path=${encodeURIComponent(path)}`,
  });

  it("provider가 있으면 저장·닫기 이동을 provider에 맡긴다", async () => {
    const value = navigation();
    const user = userEvent.setup();
    render(
      <AppNavigationProvider value={value}>
        <WorkoutForm
          title="기록하기"
          initialValues={createWorkoutFormValues(TODAY)}
          crews={[]}
          today={TODAY}
          closeHref="/workouts"
          saveWorkout={vi.fn().mockResolvedValue({ id: "new-id", ok: true })}
        />
      </AppNavigationProvider>,
    );

    await user.click(screen.getByRole("button", { name: "닫기" }));
    expect(value.push).toHaveBeenCalledWith("/workouts");

    await user.click(screen.getByRole("button", { name: "기타" }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.type(screen.getByLabelText("분"), "30");
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "기록 저장" }));

    expect(value.replace).toHaveBeenCalledWith("/workouts/new-id");
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("작성 중 링크를 누르면 확인을 받고, 나가기를 고르면 같은 링크를 다시 눌러 이동한다", async () => {
    const user = userEvent.setup();
    const follow = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <>
        <a href="/crews" onClick={follow}>
          크루
        </a>
        <WorkoutForm
          title="기록하기"
          initialValues={createWorkoutFormValues(TODAY)}
          crews={[]}
          today={TODAY}
          closeHref="/workouts"
          saveWorkout={vi.fn()}
        />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "헬스" }));
    await user.click(screen.getByRole("link", { name: "크루" }));
    expect(follow).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: "나가기" }));
    expect(follow).toHaveBeenCalledOnce();
    expect(router.push).not.toHaveBeenCalled();
  });
});
