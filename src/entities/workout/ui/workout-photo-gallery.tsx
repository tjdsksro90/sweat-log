"use client";

import { useEffect, useRef, useState } from "react";

import { CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react";

import type { WorkoutPhoto } from "@/entities/workout/model/contracts";
import { Button } from "@/shared/ui/button";

/**
 * 기록 상세의 사진. 한 장이면 원래 비율로, 여러 장이면 2열 정사각형으로 보여 주고 누르면 크게 본다.
 * 크게 보기는 브라우저 기본 <dialog>(Escape 닫기, 포커스 가두기)를 쓴다.
 * 칸 크기는 저장해 둔 가로·세로로 미리 잡아서 사진이 늦게 와도 아래 내용이 밀리지 않는다.
 * 디자인 시스템으로 옮길 후보: 이미지 라이트박스(shared/ui에 아직 없다).
 */
export function WorkoutPhotoGallery({ photos, label }: { photos: WorkoutPhoto[]; label: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;

  // 내용이 그려진 뒤에 열어야 <dialog>가 안의 첫 버튼으로 포커스를 옮긴다.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) dialog.showModal();
  }, [isOpen]);

  if (photos.length === 0) return null;

  const altOf = (index: number) => `${label} 사진 ${index + 1}/${photos.length}`;
  const single = photos.length === 1;

  const open = (index: number) => setOpenIndex(index);
  const close = () => dialogRef.current?.close();
  const move = (step: number) =>
    setOpenIndex((current) => (current === null ? current : (current + step + photos.length) % photos.length));

  const current = openIndex === null ? null : photos[openIndex];

  return (
    <section aria-labelledby="photos-heading" className="flex flex-col gap-3">
      <h2 id="photos-heading" className="sr-only">
        사진 {photos.length}장
      </h2>
      <ul className={single ? "grid" : "grid grid-cols-2 gap-2"}>
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => open(index)}
              aria-label={`${altOf(index)} 크게 보기`}
              className="block w-full overflow-hidden rounded-lg bg-muted focus-visible:outline-2"
              style={{ aspectRatio: single ? `${photo.width} / ${photo.height}` : "1 / 1" }}
            >
              <img
                src={photo.url}
                alt={altOf(index)}
                width={photo.width}
                height={photo.height}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={current && openIndex !== null ? altOf(openIndex) : "사진 크게 보기"}
        onClose={() => setOpenIndex(null)}
        // 사진 바깥(가림막)을 누르면 닫는다.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto size-full max-h-none max-w-none bg-transparent p-0 backdrop:bg-overlay"
      >
        {current && openIndex !== null && (
          <div className="flex size-full flex-col items-center justify-center gap-3 p-4">
            <img
              src={current.url}
              alt={altOf(openIndex)}
              width={current.width}
              height={current.height}
              className="max-h-[80dvh] w-auto max-w-full rounded-lg object-contain"
            />
            <div className="flex items-center gap-2 rounded-full bg-popover p-1 text-popover-foreground shadow-sheet">
              {!single && (
                <Button variant="ghost" size="icon" aria-label="이전 사진" onClick={() => move(-1)}>
                  <CaretLeftIcon size={22} />
                </Button>
              )}
              {!single && (
                <span className="px-1 text-caption tabular-nums" aria-live="polite">
                  {openIndex + 1} / {photos.length}
                </span>
              )}
              {!single && (
                <Button variant="ghost" size="icon" aria-label="다음 사진" onClick={() => move(1)}>
                  <CaretRightIcon size={22} />
                </Button>
              )}
              <Button variant="ghost" size="icon" aria-label="닫기" onClick={close}>
                <XIcon size={22} />
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
