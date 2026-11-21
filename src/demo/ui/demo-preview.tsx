"use client";

import { useRef } from "react";

import { ArrowCounterClockwiseIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";

import { Button } from "@/shared/ui/button";

import { DEMO_APP_PATH } from "../model/demo-path";

// 체험 앱을 휴대폰 크기 창으로 띄운다. 같은 탭의 sessionStorage를 쓰므로 바깥에서 초기화하고 창만 다시 연다.
export function DemoPreview() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  // 체험 저장소(샘플 데이터 포함)는 소개 화면에서 이 버튼에만 필요하므로 누를 때 불러온다.
  const restart = async () => {
    let reset: () => void;
    let resetUserExercises: () => void;
    try {
      [{ reset }, { resetUserExercises }] = await Promise.all([import("../store"), import("../user-exercises")]);
    } catch {
      // 배포 뒤 예전 청크가 없어졌거나 연결이 끊긴 경우다. 새 페이지를 받으면 다시 누를 수 있다.
      window.location.reload();
      return;
    }
    reset();
    resetUserExercises();
    frameRef.current?.contentWindow?.location.replace(DEMO_APP_PATH);
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <iframe
        ref={frameRef}
        src={DEMO_APP_PATH}
        title="땀일기 체험 화면"
        className="h-[min(780px,calc(100dvh-8rem))] w-full max-w-[390px] rounded-xl border bg-background shadow-sheet"
      />
      <div className="flex w-full max-w-[390px] flex-wrap gap-3">
        <Button className="flex-1" variant="outline" onClick={restart}>
          <ArrowCounterClockwiseIcon aria-hidden="true" />
          처음부터 다시
        </Button>
        <Button
          className="flex-1"
          variant="ghost"
          role="link"
          nativeButton={false}
          render={<a href={DEMO_APP_PATH} target="_blank" rel="noopener" />}
        >
          <ArrowSquareOutIcon aria-hidden="true" />
          전체 화면으로
        </Button>
      </div>
    </div>
  );
}
