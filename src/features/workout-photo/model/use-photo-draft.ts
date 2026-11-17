"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { WorkoutPhoto } from "@/entities/workout/model/contracts";

import { addDraftPhotos, createPhotoDraft, type NewDraftPhoto, type PhotoDraft, removeDraftPhoto } from "./photo-draft";

/**
 * 폼 전체에서 사진 목록을 들고 있는다. 단계를 옮겨 사진 고르는 화면이 사라져도 고른 사진과 줄이는 중인 상태가
 * 남아야 해서 폼(WorkoutForm)이 이 훅을 쓴다. 폼은 isPreparing 동안 저장을 막는다.
 * 미리보기 object URL은 목록에서 빠지면 바로, 폼을 떠나면 한꺼번에 정리한다.
 */
export const usePhotoDraft = (initialPhotos: WorkoutPhoto[] = []) => {
  const [draft, setDraft] = useState<PhotoDraft>(() => createPhotoDraft(initialPhotos));
  const [isPreparing, setIsPreparing] = useState(false);
  const objectUrls = useRef(new Set<string>());
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    const urls = objectUrls.current;
    return () => {
      isMounted.current = false;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  // 빼거나 자리가 없어 붙지 못한 사진의 미리보기 URL을 정리한다.
  useEffect(() => {
    const inUse = new Set(draft.items.map((item) => item.url));
    for (const url of objectUrls.current) {
      if (inUse.has(url)) continue;
      URL.revokeObjectURL(url);
      objectUrls.current.delete(url);
    }
  }, [draft]);

  // 줄이는 동안 목록이 바뀌었을 수 있어서 그때의 최신 목록에 붙인다.
  const addPhotos = useCallback((photos: NewDraftPhoto[]) => {
    if (!isMounted.current) {
      for (const photo of photos) URL.revokeObjectURL(photo.url);
      return;
    }
    for (const photo of photos) objectUrls.current.add(photo.url);
    setDraft((current) => addDraftPhotos(current, photos).draft);
  }, []);

  const removePhoto = useCallback((key: string) => setDraft((current) => removeDraftPhoto(current, key)), []);

  return { draft, setDraft, isPreparing, setIsPreparing, addPhotos, removePhoto };
};
