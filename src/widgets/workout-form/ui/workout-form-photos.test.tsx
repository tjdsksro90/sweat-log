import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import type { WorkoutPhoto } from "@/entities/workout/model/contracts";
import { createWorkoutFormValues } from "@/features/workout/model/workout-form";
import { compressPhoto } from "@/features/workout-photo/lib/compress-photo";
import type { PhotoActions } from "@/features/workout-photo/model/photo-draft";
import type { SaveWorkoutAction } from "@/widgets/workout-form/model/types";
import { WorkoutForm } from "@/widgets/workout-form/ui/workout-form";

const router = { back: vi.fn(), push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

// jsdom에는 canvas 디코딩이 없어서 줄이기는 가짜로 바꾼다. 줄이는 규칙은 model/resize.test.ts가 본다.
vi.mock("@/features/workout-photo/lib/compress-photo", () => ({
  compressPhoto: vi.fn(async (file: File) =>
    file.name.startsWith("broken")
      ? { error: "이 사진은 읽을 수 없어요. JPG나 PNG 사진을 골라 주세요." }
      : { blob: new Blob([file.name], { type: "image/jpeg" }), width: 1600, height: 1200 },
  ),
}));

const TODAY = "2026-11-15";

const photoFile = (name: string) => new File(["x"], name, { type: "image/jpeg" });

const renderForm = ({
  saveWorkout = vi.fn<SaveWorkoutAction>().mockResolvedValue({ id: "new-id", ok: true }),
  photoActions,
  photoUnavailableMessage,
  initialPhotos,
  workoutId,
}: {
  saveWorkout?: Mock<SaveWorkoutAction>;
  photoActions?: PhotoActions;
  photoUnavailableMessage?: string;
  initialPhotos?: WorkoutPhoto[];
  workoutId?: string;
} = {}) => {
  const { container } = render(
    <WorkoutForm
      title="기록하기"
      initialValues={{ ...createWorkoutFormValues(TODAY), id: workoutId ?? null }}
      initialPhotos={initialPhotos}
      crews={[]}
      today={TODAY}
      closeHref="/workouts"
      saveWorkout={saveWorkout}
      photoActions={photoActions}
      photoUnavailableMessage={photoUnavailableMessage}
    />,
  );
  const user = userEvent.setup();
  const goToFinish = async () => {
    await user.click(screen.getByRole("button", { name: "기타" }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.type(screen.getByLabelText("분"), "30");
    await user.click(screen.getByRole("button", { name: "다음" }));
  };
  const fileInput = () => container.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;
  return { saveWorkout, user, goToFinish, fileInput };
};

const okActions = (): PhotoActions => ({
  upload: vi.fn().mockResolvedValue({ ok: true, photo: { id: "photo-id" } }),
  remove: vi.fn().mockResolvedValue({ ok: true }),
});

describe("WorkoutForm 사진", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => `blob:${crypto.randomUUID()}`);
    URL.revokeObjectURL = vi.fn();
  });

  it("고른 사진은 기록을 저장한 뒤 그 기록에 올린다", async () => {
    const photoActions = okActions();
    const { saveWorkout, user, goToFinish, fileInput } = renderForm({ photoActions });
    await goToFinish();

    await user.upload(fileInput(), [photoFile("a.jpg"), photoFile("b.jpg")]);
    expect(await screen.findByRole("img", { name: "고른 사진 2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "사진 1 빼기" }));
    expect(screen.getAllByRole("img")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "기록 저장" }));

    expect(saveWorkout).toHaveBeenCalledTimes(1);
    expect(photoActions.upload).toHaveBeenCalledTimes(1);
    expect(vi.mocked(photoActions.upload).mock.calls[0][0]).toBe("new-id");
    expect(router.replace).toHaveBeenCalledWith("/workouts/new-id");
  });

  it("읽을 수 없는 사진과 4장을 넘는 사진은 안내하고 빼 둔다", async () => {
    const { user, goToFinish, fileInput } = renderForm({ photoActions: okActions() });
    await goToFinish();

    await user.upload(fileInput(), [photoFile("broken.heic")]);
    expect(await screen.findByRole("alert")).toHaveTextContent("이 사진은 읽을 수 없어요.");

    await user.upload(
      fileInput(),
      ["1", "2", "3", "4", "5"].map((name) => photoFile(`${name}.jpg`)),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("사진은 4장까지 붙일 수 있어요.");
    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "사진 4장을 모두 골랐어요" })).toBeDisabled();
  });

  it("기록은 저장됐는데 사진 일부가 실패하면 머물고, 다시 저장하면 그 기록을 고치며 남은 사진만 올린다", async () => {
    const photoActions = okActions();
    vi.mocked(photoActions.upload)
      .mockResolvedValueOnce({ ok: true, photo: { id: "p1" } })
      .mockResolvedValueOnce({ ok: false, error: "사진을 올리지 못했어요. 잠시 뒤 다시 시도해 주세요." });
    const { saveWorkout, user, goToFinish, fileInput } = renderForm({ photoActions });
    await goToFinish();

    await user.upload(fileInput(), [photoFile("a.jpg"), photoFile("b.jpg")]);
    await screen.findByRole("img", { name: "고른 사진 2" });
    await user.click(screen.getByRole("button", { name: "기록 저장" }));

    expect(await screen.findByText(/기록은 저장했어요. 사진 1장은 반영하지 못했어요./)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "고른 사진 2 (올리지 못함)" })).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: "기록 저장" }));
    expect(saveWorkout).toHaveBeenLastCalledWith(expect.objectContaining({ id: "new-id" }));
    expect(photoActions.upload).toHaveBeenCalledTimes(3);
    expect(router.replace).toHaveBeenCalledWith("/workouts/new-id");
  });

  it("기록 저장이 실패하면 사진을 올리지 않고 고른 사진을 그대로 둔다", async () => {
    const photoActions = okActions();
    const { user, goToFinish, fileInput } = renderForm({
      photoActions,
      saveWorkout: vi.fn<SaveWorkoutAction>().mockResolvedValue({ error: "잠시 후 다시 시도해 주세요.", ok: false }),
    });
    await goToFinish();
    await user.upload(fileInput(), [photoFile("a.jpg")]);
    await screen.findByRole("img", { name: "고른 사진 1" });

    await user.click(screen.getByRole("button", { name: "기록 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("잠시 후 다시 시도해 주세요.");
    expect(photoActions.upload).not.toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "고른 사진 1" })).toBeInTheDocument();
  });

  it("사진을 줄이는 동안에는 저장을 막고, 끝나면 그 사진까지 올린다", async () => {
    const photoActions = okActions();
    let finish: (value: Awaited<ReturnType<typeof compressPhoto>>) => void = () => {};
    vi.mocked(compressPhoto).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { saveWorkout, user, goToFinish, fileInput } = renderForm({ photoActions });
    await goToFinish();

    await user.upload(fileInput(), [photoFile("slow.jpg")]);
    // 사진 추가 버튼과 저장 버튼이 둘 다 막힌다.
    const busy = await screen.findAllByRole("button", { name: "사진 줄이는 중…" });
    expect(busy).toHaveLength(2);
    for (const button of busy) expect(button).toBeDisabled();
    await user.click(busy[1]);
    expect(saveWorkout).not.toHaveBeenCalled();

    finish({ blob: new Blob(["slow"], { type: "image/jpeg" }), width: 1600, height: 1200 });
    await user.click(await screen.findByRole("button", { name: "기록 저장" }));

    expect(saveWorkout).toHaveBeenCalledTimes(1);
    expect(photoActions.upload).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith("/workouts/new-id");
  });

  it("줄이는 동안 앞 단계로 갔다 와도 줄인 사진은 기존 사진 뒤에 붙는다", async () => {
    const photoActions = okActions();
    const { user, goToFinish, fileInput } = renderForm({
      photoActions,
      workoutId: "w1",
      initialPhotos: [{ id: "saved-1", url: "https://example.test/1.jpg", width: 1600, height: 1200 }],
    });
    await goToFinish();

    let finish: (value: Awaited<ReturnType<typeof compressPhoto>>) => void = () => {};
    vi.mocked(compressPhoto).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await user.upload(fileInput(), [photoFile("slow.jpg")]);
    // 사진 고르기가 화면에서 사라져도 줄이기는 폼에 이어서 붙는다.
    await user.click(screen.getByRole("button", { name: "이전" }));
    finish({ blob: new Blob(["slow"], { type: "image/jpeg" }), width: 1600, height: 1200 });
    await user.click(await screen.findByRole("button", { name: "다음" }));

    expect(await screen.findByRole("img", { name: "고른 사진 2" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "사진 1 빼기" }));
    await user.click(screen.getByRole("button", { name: "기록 저장" }));

    expect(photoActions.remove).toHaveBeenCalledWith("saved-1");
    expect(photoActions.upload).toHaveBeenCalledTimes(1);
  });

  it("서명 URL을 못 만든 사진도 자리를 차지하고 뺄 수 있다", async () => {
    const photoActions = okActions();
    const saved = (id: string, url: string | null): WorkoutPhoto => ({ id, url, width: 1600, height: 1200 });
    const { user, goToFinish } = renderForm({
      photoActions,
      workoutId: "w1",
      initialPhotos: [
        saved("p1", "https://example.test/1.jpg"),
        saved("p2", null),
        saved("p3", "https://example.test/3.jpg"),
        saved("p4", "https://example.test/4.jpg"),
      ],
    });
    await goToFinish();

    expect(screen.getByRole("img", { name: "고른 사진 2 (미리보기를 불러오지 못함)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "사진 4장을 모두 골랐어요" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "사진 2 빼기" }));
    await user.click(screen.getByRole("button", { name: "기록 저장" }));
    expect(photoActions.remove).toHaveBeenCalledWith("p2");
  });

  it("사진을 올릴 수 없는 곳(체험)에서는 추가 버튼을 막고 안내한다", async () => {
    const { goToFinish } = renderForm({ photoUnavailableMessage: "체험에서는 사진을 올릴 수 없어요." });
    await goToFinish();

    expect(screen.getByText("체험에서는 사진을 올릴 수 없어요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "사진 추가" })).toBeDisabled();
  });

  it("사진 기능을 넘기지 않으면 사진 고르기를 보여 주지 않는다", async () => {
    const { goToFinish } = renderForm();
    await goToFinish();
    expect(screen.queryByRole("group", { name: "사진 (선택)" })).not.toBeInTheDocument();
  });
});
