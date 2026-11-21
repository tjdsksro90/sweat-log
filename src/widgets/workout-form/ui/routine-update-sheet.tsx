"use client";

import { useRef } from "react";

import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/shared/ui/bottom-sheet";
import { Button } from "@/shared/ui/button";

/**
 * 루틴을 불러와 기록을 저장한 뒤 "이 내용으로 루틴을 업데이트할까요?"를 묻는다. 기록은 이미 저장된 뒤다.
 * 갱신이 실패하면(루틴이 그사이 지워짐 등) 짧게 알리고, 확인을 누르면 원래 가려던 곳으로 넘어간다.
 * 열면 "그대로 두기"에 포커스를 둔다. 바로 Enter를 눌러도 루틴이 바뀌지 않게 한다.
 */
export function RoutineUpdateSheet({
  open,
  routineName,
  isPending,
  error,
  onConfirm,
  onSkip,
}: {
  open: boolean;
  routineName: string;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const skipRef = useRef<HTMLButtonElement>(null);

  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) onSkip();
      }}
    >
      <BottomSheetContent showCloseButton={false} initialFocus={skipRef}>
        {error ? (
          <>
            <BottomSheetHeader>
              <BottomSheetTitle>루틴은 그대로예요</BottomSheetTitle>
              <BottomSheetDescription>{error} 기록은 저장했어요.</BottomSheetDescription>
            </BottomSheetHeader>
            <BottomSheetFooter>
              <Button ref={skipRef} variant="primary" size="lg" onClick={onSkip}>
                확인
              </Button>
            </BottomSheetFooter>
          </>
        ) : (
          <>
            <BottomSheetHeader>
              <BottomSheetTitle>‘{routineName}’ 루틴을 이 내용으로 업데이트할까요?</BottomSheetTitle>
              <BottomSheetDescription>
                방금 저장한 종목과 세트, 무게, 횟수로 루틴을 바꿔요. 지난 기록은 바뀌지 않아요.
              </BottomSheetDescription>
            </BottomSheetHeader>
            <BottomSheetFooter>
              <Button variant="primary" size="lg" onClick={onConfirm} disabled={isPending}>
                {isPending ? "업데이트 중…" : "루틴 업데이트"}
              </Button>
              <Button ref={skipRef} variant="secondary" size="lg" onClick={onSkip} disabled={isPending}>
                그대로 두기
              </Button>
            </BottomSheetFooter>
          </>
        )}
      </BottomSheetContent>
    </BottomSheet>
  );
}
