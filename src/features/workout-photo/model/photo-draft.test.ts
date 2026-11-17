import { describe, expect, it, vi } from "vitest";

import {
  addDraftPhotos,
  createPhotoDraft,
  isPhotoDraftDirty,
  type NewDraftPhoto,
  type PhotoActions,
  removeDraftPhoto,
  syncPhotoDraft,
} from "./photo-draft";

const saved = (id: string) => ({ id, url: `https://storage/${id}`, width: 1600, height: 1200 });
const fresh = (key: string): NewDraftPhoto => ({
  kind: "new",
  key,
  blob: new Blob([key]),
  url: `blob:${key}`,
  width: 1200,
  height: 1600,
  failed: false,
});

const okActions = (): PhotoActions => ({
  upload: vi.fn(async (_workoutId: string, formData: FormData) => ({
    ok: true as const,
    photo: { id: `id-${(formData.get("file") as File).name.replace(".jpg", "")}` },
  })),
  remove: vi.fn(async () => ({ ok: true as const })),
});

describe("사진 목록 편집", () => {
  it("저장된 사진으로 시작하면 바뀐 것이 없다", () => {
    const draft = createPhotoDraft([saved("a")]);
    expect(draft.items).toEqual([{ kind: "saved", key: "a", ...saved("a") }]);
    expect(isPhotoDraftDirty(draft)).toBe(false);
  });

  it("4장까지만 붙이고 넘친 사진은 돌려준다", () => {
    const { draft, rejected } = addDraftPhotos(createPhotoDraft([saved("a")]), [
      fresh("n1"),
      fresh("n2"),
      fresh("n3"),
      fresh("n4"),
    ]);
    expect(draft.items.map((item) => item.key)).toEqual(["a", "n1", "n2", "n3"]);
    expect(rejected.map((item) => item.key)).toEqual(["n4"]);
    expect(isPhotoDraftDirty(draft)).toBe(true);
  });

  it("저장된 사진을 빼면 지울 목록에 넣고, 새 사진은 그냥 뺀다", () => {
    const { draft } = addDraftPhotos(createPhotoDraft([saved("a")]), [fresh("n1")]);
    const removed = removeDraftPhoto(removeDraftPhoto(draft, "a"), "n1");
    expect(removed).toEqual({ items: [], removedIds: ["a"] });
    expect(isPhotoDraftDirty(removed)).toBe(true);
  });
});

describe("syncPhotoDraft", () => {
  it("지우기를 먼저 하고 새 사진을 순서대로 올린다", async () => {
    const actions = okActions();
    const order: string[] = [];
    vi.mocked(actions.remove).mockImplementation(async (id) => {
      order.push(`remove:${id}`);
      return { ok: true };
    });
    vi.mocked(actions.upload).mockImplementation(async (_id, formData) => {
      const name = (formData.get("file") as File).name;
      order.push(`upload:${name}`);
      return { ok: true, photo: { id: `id-${name}` } };
    });

    const start = removeDraftPhoto(
      addDraftPhotos(createPhotoDraft([saved("a")]), [fresh("n1"), fresh("n2")]).draft,
      "a",
    );
    const result = await syncPhotoDraft(start, "workout-1", actions);

    expect(order).toEqual(["remove:a", "upload:n1.jpg", "upload:n2.jpg"]);
    expect(vi.mocked(actions.upload).mock.calls.every(([id]) => id === "workout-1")).toBe(true);
    expect(result.failedCount).toBe(0);
    expect(result.draft.removedIds).toEqual([]);
    // 올린 사진은 저장된 사진이 되고 미리보기 URL을 그대로 쓴다
    expect(result.draft.items).toEqual([
      { kind: "saved", key: "n1", id: "id-n1.jpg", url: "blob:n1", width: 1200, height: 1600 },
      { kind: "saved", key: "n2", id: "id-n2.jpg", url: "blob:n2", width: 1200, height: 1600 },
    ]);
    expect(isPhotoDraftDirty(result.draft)).toBe(false);
  });

  it("일부만 실패하면 실패한 것만 남겨 다시 저장할 때 다시 시도한다", async () => {
    const actions = okActions();
    vi.mocked(actions.upload).mockImplementation(async (_id, formData) =>
      (formData.get("file") as File).name === "n2.jpg"
        ? { ok: false, error: "사진을 올리지 못했어요." }
        : { ok: true, photo: { id: "id-n1" } },
    );
    vi.mocked(actions.remove).mockResolvedValue({ ok: false, error: "사진을 지우지 못했어요." });

    const start = removeDraftPhoto(
      addDraftPhotos(createPhotoDraft([saved("a")]), [fresh("n1"), fresh("n2")]).draft,
      "a",
    );
    const first = await syncPhotoDraft(start, "workout-1", actions);

    expect(first.failedCount).toBe(2);
    expect(first.firstError).toBe("사진을 지우지 못했어요.");
    expect(first.draft.removedIds).toEqual(["a"]);
    expect(first.draft.items.map((item) => [item.key, item.kind, item.kind === "new" && item.failed])).toEqual([
      ["n1", "saved", false],
      ["n2", "new", true],
    ]);

    // 다시 저장: 이미 올라간 n1은 다시 올리지 않는다
    const retry = okActions();
    const second = await syncPhotoDraft(first.draft, "workout-1", retry);
    expect(retry.upload).toHaveBeenCalledTimes(1);
    expect(retry.remove).toHaveBeenCalledWith("a");
    expect(second.failedCount).toBe(0);
  });

  it("네트워크 오류로 액션이 던져도 실패로 센다", async () => {
    const actions = okActions();
    vi.mocked(actions.upload).mockRejectedValue(new Error("offline"));
    const result = await syncPhotoDraft(addDraftPhotos(createPhotoDraft(), [fresh("n1")]).draft, "w", actions);
    expect(result.failedCount).toBe(1);
    expect(result.firstError).toBeNull();
  });
});
