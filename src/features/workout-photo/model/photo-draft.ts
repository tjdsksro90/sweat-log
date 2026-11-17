/**
 * 작성·수정 폼의 사진 목록. 새 기록은 저장하기 전에는 id가 없어서 사진을 바로 올릴 수 없다.
 * 그래서 고른 사진은 줄인 Blob으로 들고 있다가, 기록을 저장한 뒤 syncPhotoDraft가 지우기 → 올리기 순으로 반영한다.
 */
import type { WorkoutPhoto } from "@/entities/workout/model/contracts";
import { MAX_WORKOUT_PHOTOS } from "@/entities/workout/model/photo";

// url이 null이면 서명 URL을 만들지 못한 사진이다. 미리보기는 없어도 자리를 차지하고 뺄 수 있다.
export type SavedDraftPhoto = {
  kind: "saved";
  key: string;
  id: string;
  url: string | null;
  width: number;
  height: number;
};
export type NewDraftPhoto = {
  kind: "new";
  key: string;
  blob: Blob;
  url: string; // 미리보기용 object URL
  width: number;
  height: number;
  failed: boolean; // 지난 저장에서 올리지 못함
};
export type DraftPhoto = SavedDraftPhoto | NewDraftPhoto;

export type PhotoDraft = { items: DraftPhoto[]; removedIds: string[] };

export type UploadPhotoResult = { ok: true; photo: { id: string } } | { ok: false; error: string };
export type DeletePhotoResult = { ok: true } | { ok: false; error: string };
export type UploadPhotoAction = (workoutId: string, formData: FormData) => Promise<UploadPhotoResult>;
export type DeletePhotoAction = (photoId: string) => Promise<DeletePhotoResult>;
export type PhotoActions = { upload: UploadPhotoAction; remove: DeletePhotoAction };

export const createPhotoDraft = (photos: WorkoutPhoto[] = []): PhotoDraft => ({
  items: photos.map((photo) => ({ kind: "saved", key: photo.id, ...photo })),
  removedIds: [],
});

export const getRemainingPhotoSlots = (draft: PhotoDraft) => Math.max(0, MAX_WORKOUT_PHOTOS - draft.items.length);

export const isPhotoDraftDirty = (draft: PhotoDraft) =>
  draft.removedIds.length > 0 || draft.items.some((item) => item.kind === "new");

// 남은 자리만큼만 붙인다. 넘친 사진은 돌려줘서 화면이 미리보기 URL을 정리하고 안내한다.
export const addDraftPhotos = (draft: PhotoDraft, photos: NewDraftPhoto[]) => {
  const slots = getRemainingPhotoSlots(draft);
  return {
    draft: { ...draft, items: [...draft.items, ...photos.slice(0, slots)] },
    rejected: photos.slice(slots),
  };
};

export const removeDraftPhoto = (draft: PhotoDraft, key: string): PhotoDraft => {
  const target = draft.items.find((item) => item.key === key);
  if (!target) return draft;
  return {
    items: draft.items.filter((item) => item.key !== key),
    removedIds: target.kind === "saved" ? [...draft.removedIds, target.id] : draft.removedIds,
  };
};

export const toUploadFormData = (photo: NewDraftPhoto) => {
  const formData = new FormData();
  formData.set("file", photo.blob, `${photo.key}.jpg`);
  return formData;
};

export type PhotoSyncResult = { draft: PhotoDraft; failedCount: number; firstError: string | null };

/**
 * 기록을 저장한 뒤 사진을 반영한다. 4장 제한에 걸리지 않도록 지우기를 먼저 하고, 올리기는 순서대로 한 장씩 한다.
 * 실패한 것은 그대로 남겨(지우기는 removedIds, 올리기는 failed 표시) 다시 저장하면 그것만 다시 시도한다.
 */
export const syncPhotoDraft = async (
  draft: PhotoDraft,
  workoutId: string,
  actions: PhotoActions,
): Promise<PhotoSyncResult> => {
  let failedCount = 0;
  let firstError: string | null = null;
  const fail = (error: string) => {
    failedCount += 1;
    if (error && !firstError) firstError = error;
  };

  const removedIds: string[] = [];
  for (const id of draft.removedIds) {
    const result = await actions.remove(id).catch(() => ({ ok: false as const, error: "" }));
    if (!result.ok) {
      removedIds.push(id);
      fail(result.error);
    }
  }

  const items: DraftPhoto[] = [];
  for (const item of draft.items) {
    if (item.kind === "saved") {
      items.push(item);
      continue;
    }
    const result = await actions
      .upload(workoutId, toUploadFormData(item))
      .catch(() => ({ ok: false as const, error: "" }));
    if (result.ok) {
      items.push({
        kind: "saved",
        key: item.key,
        id: result.photo.id,
        url: item.url,
        width: item.width,
        height: item.height,
      });
    } else {
      items.push({ ...item, failed: true });
      fail(result.error);
    }
  }

  return { draft: { items, removedIds }, failedCount, firstError };
};
