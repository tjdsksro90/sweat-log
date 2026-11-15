"use client";

import { useActionState } from "react";

import Link from "next/link";

import { type AuthFormState, INITIAL_AUTH_FORM_STATE } from "@/features/auth";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type AuthFormProps = {
  mode: "login" | "signup";
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
};

export function AuthForm({ action, mode }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_AUTH_FORM_STATE);
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">이메일</Label>
        <Input autoComplete="email" id="email" inputMode="email" name="email" required type="email" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          autoComplete={isSignup ? "new-password" : "current-password"}
          id="password"
          minLength={6}
          name="password"
          required
          type="password"
        />
      </div>
      {isSignup && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="nickname">닉네임</Label>
          <Input id="nickname" maxLength={20} name="nickname" placeholder="크루에게 보일 이름" required />
        </div>
      )}
      {state.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}
      <Button disabled={isPending} size="lg" type="submit">
        {isPending ? "잠시만요…" : isSignup ? "가입하기" : "로그인"}
      </Button>
      <p className="text-center text-muted-foreground text-sm">
        {isSignup ? "이미 계정이 있나요? " : "처음이에요? "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={isSignup ? "/login" : "/signup"}
        >
          {isSignup ? "로그인" : "가입하기"}
        </Link>
      </p>
    </form>
  );
}
