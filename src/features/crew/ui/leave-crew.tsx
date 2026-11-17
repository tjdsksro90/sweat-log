"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/shared/ui/button";
import { FieldError } from "@/shared/ui/field";

import type { CrewFormState } from "../model/crew-form";
import type { LeaveCrewSheet as LeaveCrewSheetComponent } from "./leave-crew-sheet";

/**
 * 시트(Base UI Dialog·포커스 관리)는 크루 상세 JS의 약 20KB를 차지하지만 누를 때만 필요하다.
 * 그래서 버튼만 먼저 그리고 시트 코드는 직접 import()한다. 버튼에 손이 가면(pointer·focus) 미리 받는다.
 * next/dynamic(React.lazy)은 import가 실패하면 렌더 중에 오류를 던져 화면 전체가 error.tsx로 바뀌고,
 * 실패한 결과를 기억해 다시 눌러도 같은 오류가 난다. 직접 불러와 실패하면 안내만 하고 다음 시도에 다시 받는다.
 */
type SheetComponent = typeof LeaveCrewSheetComponent;
let sheetPromise: Promise<SheetComponent> | null = null;
const loadSheet = () => {
  sheetPromise ??= import("./leave-crew-sheet").then(
    (module) => module.LeaveCrewSheet,
    (error: unknown) => {
      sheetPromise = null;
      throw error;
    },
  );
  return sheetPromise;
};
const prefetchSheet = () => {
  loadSheet().catch(() => {});
};

type LeaveCrewProps = {
  crewId: string;
  isOwner: boolean;
  action: (state: CrewFormState, formData: FormData) => Promise<CrewFormState>;
};

export function LeaveCrew({ crewId, isOwner, action }: LeaveCrewProps) {
  const [Sheet, setSheet] = useState<SheetComponent | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetId = useId();
  if (isOwner) return <p className="text-caption text-muted-foreground">크루장은 크루를 나갈 수 없어요.</p>;

  const openSheet = async () => {
    if (Sheet) {
      setOpen(true);
      return;
    }
    if (loading) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const loaded = await loadSheet();
      setSheet(() => loaded);
      setOpen(true);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        ref={triggerRef}
        variant="outline"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? sheetId : undefined}
        aria-busy={loading || undefined}
        onPointerEnter={prefetchSheet}
        onFocus={prefetchSheet}
        onClick={openSheet}
      >
        {loading ? "여는 중…" : "크루 나가기"}
      </Button>
      {loadFailed && <FieldError>화면을 불러오지 못했어요. 연결을 확인하고 다시 눌러 주세요.</FieldError>}
      {Sheet && (
        <Sheet
          crewId={crewId}
          action={action}
          open={open}
          onOpenChange={setOpen}
          popupId={sheetId}
          returnFocusRef={triggerRef}
        />
      )}
    </div>
  );
}
