"use client";

import { type ComponentProps, useState } from "react";

import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";

import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";

type PasswordInputProps = Omit<ComponentProps<"input">, "type">;

// 비밀번호 칸 오른쪽에 보기/숨기기 토글을 붙인다. 칸마다 상태를 따로 가진다.
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      {/* Edge가 칸 안에 띄우는 기본 보기·지우기 아이콘이 우리 토글과 겹치지 않게 숨긴다. */}
      <Input
        {...props}
        className={cn("pr-12 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden", className)}
        type={isVisible ? "text" : "password"}
      />
      <button
        aria-label={isVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
        aria-pressed={isVisible}
        className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-lg text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
        onClick={() => setIsVisible((visible) => !visible)}
        type="button"
      >
        {isVisible ? <EyeSlashIcon aria-hidden size={20} /> : <EyeIcon aria-hidden size={20} />}
      </button>
    </div>
  );
}
