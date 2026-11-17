"use client";

import { type RefObject, useActionState } from "react";

import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/shared/ui/bottom-sheet";
import { Button } from "@/shared/ui/button";
import { FieldError } from "@/shared/ui/field";

import { type CrewFormState, INITIAL_CREW_FORM_STATE } from "../model/crew-form";

export type LeaveCrewSheetProps = {
  crewId: string;
  action: (state: CrewFormState, formData: FormData) => Promise<CrewFormState>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

// 크루 나가기 확인 시트. 시트 코드(Base UI Dialog)는 처음 열 때 불러오도록 leave-crew.tsx에서 지연 로딩한다.
export function LeaveCrewSheet({ crewId, action, open, onOpenChange, returnFocusRef }: LeaveCrewSheetProps) {
  const [state, submit, pending] = useActionState(action, INITIAL_CREW_FORM_STATE);
  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <BottomSheetContent showCloseButton={!pending} finalFocus={returnFocusRef}>
        <BottomSheetHeader>
          <BottomSheetTitle>크루에서 나갈까요?</BottomSheetTitle>
          <BottomSheetDescription>
            나가면 크루에 공유된 친구들의 기록을 볼 수 없어요. 초대 코드로 다시 가입할 수 있어요.
          </BottomSheetDescription>
        </BottomSheetHeader>
        <form action={submit}>
          <input type="hidden" name="crewId" value={crewId} />
          {state.error && <FieldError className="px-5">{state.error}</FieldError>}
          <BottomSheetFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "나가는 중…" : "나가기 확인"}
            </Button>
            <BottomSheetClose render={<Button type="button" variant="outline" disabled={pending} />}>
              취소
            </BottomSheetClose>
          </BottomSheetFooter>
        </form>
      </BottomSheetContent>
    </BottomSheet>
  );
}
