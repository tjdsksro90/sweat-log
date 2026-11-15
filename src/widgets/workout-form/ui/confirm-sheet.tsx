"use client";

import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/shared/ui/bottom-sheet";
import { Button } from "@/shared/ui/button";
import { FieldError } from "@/shared/ui/field";

/**
 * 이탈·삭제 확인. 비동기 작업이 끝난 뒤 호출자가 닫도록 제어형으로만 쓴다(design.md 바텀 시트).
 */
export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "취소",
  pendingLabel,
  isPending = false,
  error,
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  pendingLabel?: string;
  isPending?: boolean;
  error?: string | null;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) onCancel();
      }}
    >
      <BottomSheetContent showCloseButton={false}>
        <BottomSheetHeader>
          <BottomSheetTitle>{title}</BottomSheetTitle>
          <BottomSheetDescription>{description}</BottomSheetDescription>
        </BottomSheetHeader>
        {error && <FieldError className="px-5">{error}</FieldError>}
        <BottomSheetFooter>
          <Button variant={destructive ? "destructive" : "primary"} size="lg" onClick={onConfirm} disabled={isPending}>
            {isPending && pendingLabel ? pendingLabel : confirmLabel}
          </Button>
          <Button variant="secondary" size="lg" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
