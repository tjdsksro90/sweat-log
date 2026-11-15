"use client";

import { useActionState, useState } from "react";

import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/shared/ui/bottom-sheet";
import { Button } from "@/shared/ui/button";
import { FieldError } from "@/shared/ui/field";

import { type CrewFormState, INITIAL_CREW_FORM_STATE } from "../model/crew-form";

type LeaveCrewProps = {
  crewId: string;
  isOwner: boolean;
  action: (state: CrewFormState, formData: FormData) => Promise<CrewFormState>;
};

export function LeaveCrew({ crewId, isOwner, action }: LeaveCrewProps) {
  const [state, submit, pending] = useActionState(action, INITIAL_CREW_FORM_STATE);
  const [open, setOpen] = useState(false);
  if (isOwner) return <p className="text-caption text-muted-foreground">크루장은 크루를 나갈 수 없어요.</p>;
  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) setOpen(nextOpen);
      }}
    >
      <BottomSheetTrigger render={<Button variant="outline" />}>크루 나가기</BottomSheetTrigger>
      <BottomSheetContent showCloseButton={!pending}>
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
