"use client";

import { type ChangeEvent, useId, useRef, useState } from "react";

import { ImageSquareIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";

import { MAX_WORKOUT_PHOTOS } from "@/entities/workout/model/photo";
import { Button } from "@/shared/ui/button";
import { FieldDescription, FieldError, FieldLegend, FieldSet } from "@/shared/ui/field";

import { compressPhoto } from "../lib/compress-photo";
import { getRemainingPhotoSlots, type NewDraftPhoto, type PhotoDraft } from "../model/photo-draft";

type PhotoPickerProps = {
  draft: PhotoDraft;
  // 줄이는 중인지는 폼이 들고 있다. 폼은 그동안 저장을 막는다.
  isPreparing: boolean;
  onPreparingChange: (isPreparing: boolean) => void;
  onAdd: (photos: NewDraftPhoto[]) => void;
  onRemove: (key: string) => void;
  disabled?: boolean;
  // 체험 데모처럼 올릴 수 없는 곳에서 이유를 보여 준다. 있으면 추가 버튼을 막는다.
  unavailableMessage?: string;
};

/**
 * 마무리 단계의 사진 고르기. 고르는 즉시 줄여서 미리 보여 주고, 실제 업로드는 기록을 저장할 때 폼이 한다.
 * 썸네일 칸은 정사각형으로 고정해 사진이 늦게 읽혀도 자리가 흔들리지 않는다.
 */
export function PhotoPicker({
  draft,
  isPreparing,
  onPreparingChange,
  onAdd,
  onRemove,
  disabled = false,
  unavailableMessage,
}: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const descriptionId = useId();
  const [error, setError] = useState<string | null>(null);
  const remaining = getRemainingPhotoSlots(draft);
  const hasFailed = draft.items.some((item) => item.kind === "new" && item.failed);

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    // 같은 사진을 다시 고를 수 있게 비운다.
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    onPreparingChange(true);
    const picked: NewDraftPhoto[] = [];
    let lastError: string | null = null;
    try {
      // 남은 자리보다 많이 고르면 앞에서부터 남은 만큼만 줄인다(큰 사진을 쓸데없이 디코딩하지 않는다).
      for (const file of files.slice(0, remaining)) {
        const result = await compressPhoto(file);
        if ("error" in result) {
          lastError = result.error;
          continue;
        }
        picked.push({
          kind: "new",
          key: crypto.randomUUID(),
          url: URL.createObjectURL(result.blob),
          failed: false,
          ...result,
        });
      }
    } finally {
      onPreparingChange(false);
    }

    // 폼이 최신 목록에 붙이고, 자리가 없어 붙지 못한 사진은 미리보기 URL까지 정리한다.
    onAdd(picked);
    if (files.length > remaining) lastError = `사진은 ${MAX_WORKOUT_PHOTOS}장까지 붙일 수 있어요.`;
    setError(lastError);
  };

  const handleRemove = (key: string) => {
    setError(null);
    onRemove(key);
  };

  return (
    <FieldSet className="min-w-0 gap-3" aria-describedby={descriptionId}>
      <FieldLegend variant="label">사진 (선택)</FieldLegend>
      <FieldDescription id={descriptionId}>
        {unavailableMessage ?? `${MAX_WORKOUT_PHOTOS}장까지 붙일 수 있어요. 올릴 때 크기를 줄여요.`}
      </FieldDescription>

      {draft.items.length > 0 && (
        <ul className="grid grid-cols-4 gap-2">
          {draft.items.map((item, index) => {
            const failed = item.kind === "new" && item.failed;
            return (
              <li key={item.key} className="relative aspect-square overflow-hidden rounded-md bg-muted">
                <img
                  src={item.url}
                  alt={`고른 사진 ${index + 1}${failed ? " (올리지 못함)" : ""}`}
                  width={item.width}
                  height={item.height}
                  className="size-full object-cover"
                />
                {failed && (
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-background/85 py-0.5 text-caption text-foreground">
                    <WarningCircleIcon size={14} aria-hidden="true" />
                    다시 올려요
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`사진 ${index + 1} 빼기`}
                  onClick={() => handleRemove(item.key)}
                  disabled={disabled || isPreparing}
                  className="absolute top-0 right-0 flex size-11 items-start justify-end p-1 disabled:opacity-50"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-background/85 text-foreground shadow-card">
                    <XIcon size={14} aria-hidden="true" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        hidden
        onChange={handleFiles}
      />
      <Button
        variant="outline"
        className="self-start"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isPreparing || remaining === 0 || Boolean(unavailableMessage)}
      >
        <ImageSquareIcon size={20} aria-hidden="true" />
        {isPreparing ? "사진 줄이는 중…" : remaining === 0 ? "사진 4장을 모두 골랐어요" : "사진 추가"}
      </Button>
      {hasFailed && (
        <FieldDescription>표시된 사진은 아직 올라가지 않았어요. 기록을 다시 저장하면 올려요.</FieldDescription>
      )}
      {error && <FieldError>{error}</FieldError>}
    </FieldSet>
  );
}
