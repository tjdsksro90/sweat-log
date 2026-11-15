"use client";

import { useState } from "react";

import { Button } from "@/shared/ui/button";

export function CopyInviteCode({ code }: { code: string }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const copy = async () => {
    setPending(true);
    setMessage("");
    try {
      await navigator.clipboard.writeText(code);
      setMessage("초대 코드를 복사했어요.");
    } catch {
      setMessage("복사하지 못했어요. 위의 코드를 선택해 직접 복사해 주세요.");
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" onClick={copy} disabled={pending}>
        {pending ? "복사 중…" : "초대 코드 복사"}
      </Button>
      <p role="status" className="text-caption text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
