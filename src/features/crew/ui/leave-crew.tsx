"use client";

import { useRef, useState } from "react";

import dynamic from "next/dynamic";

import { Button } from "@/shared/ui/button";

import type { CrewFormState } from "../model/crew-form";

/**
 * 시트(Base UI Dialog·포커스 관리)는 크루 상세 JS의 약 30KB를 차지하지만 누를 때만 필요하다.
 * 그래서 버튼만 먼저 그리고, 처음 누를 때 시트 코드를 불러온다.
 */
const LeaveCrewSheet = dynamic(() => import("./leave-crew-sheet").then((module) => module.LeaveCrewSheet), {
  ssr: false,
});

type LeaveCrewProps = {
  crewId: string;
  isOwner: boolean;
  action: (state: CrewFormState, formData: FormData) => Promise<CrewFormState>;
};

export function LeaveCrew({ crewId, isOwner, action }: LeaveCrewProps) {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  if (isOwner) return <p className="text-caption text-muted-foreground">크루장은 크루를 나갈 수 없어요.</p>;
  return (
    <>
      <Button
        ref={triggerRef}
        variant="outline"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setRequested(true);
          setOpen(true);
        }}
      >
        크루 나가기
      </Button>
      {requested && (
        <LeaveCrewSheet
          crewId={crewId}
          action={action}
          open={open}
          onOpenChange={setOpen}
          returnFocusRef={triggerRef}
        />
      )}
    </>
  );
}
