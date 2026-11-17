"use client";

import { useEffect, useRef, useState } from "react";

import type { WorkoutPhoto } from "@/entities/workout/model/contracts";

import { createPhotoDraft, type PhotoDraft } from "./photo-draft";

/**
 * 폼 전체에서 사진 목록을 들고 있는다. 단계를 옮겨 사진 고르는 화면이 사라져도 고른 사진이 남아야 해서
 * 폼(WorkoutForm)이 이 훅을 쓴다. 미리보기 object URL은 폼을 떠날 때 한꺼번에 정리한다.
 */
export const usePhotoDraft = (initialPhotos: WorkoutPhoto[] = []) => {
  const [draft, setDraft] = useState<PhotoDraft>(() => createPhotoDraft(initialPhotos));
  const objectUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  return {
    draft,
    setDraft,
    trackObjectUrl: (url: string) => objectUrls.current.add(url),
    releaseObjectUrl: (url: string) => {
      if (!objectUrls.current.delete(url)) return;
      URL.revokeObjectURL(url);
    },
  };
};
