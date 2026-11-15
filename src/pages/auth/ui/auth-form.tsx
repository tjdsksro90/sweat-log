"use client";

import { useActionState, useRef, useState } from "react";

import Link from "next/link";

import { type AuthFormState, INITIAL_AUTH_FORM_STATE, PASSWORD_MISMATCH_MESSAGE } from "@/features/auth";
import { Button } from "@/shared/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

type AuthFormProps = {
  mode: "login" | "signup";
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
};

export function AuthForm({ action, mode }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_AUTH_FORM_STATE);
  const isSignup = mode === "signup";
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);
  const isConfirmTouched = useRef(false);
  const [showMismatch, setShowMismatch] = useState(false);

  // 브라우저 검증에도 같은 문구를 걸어 두어, 다르면 제출 자체가 막히게 한다.
  const syncPasswordMismatch = () => {
    const confirm = passwordConfirmRef.current;
    if (!confirm) return;
    const isMismatch = confirm.value !== passwordRef.current?.value;
    confirm.setCustomValidity(isMismatch ? PASSWORD_MISMATCH_MESSAGE : "");
    // 확인 칸을 다 입력하기 전에는 오류를 띄우지 않는다.
    if (isConfirmTouched.current) setShowMismatch(isMismatch && confirm.value.length > 0);
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="email">이메일</FieldLabel>
        <Input autoComplete="email" id="email" inputMode="email" name="email" required type="email" />
      </Field>
      <Field>
        <FieldLabel htmlFor="password">비밀번호</FieldLabel>
        <Input
          autoComplete={isSignup ? "new-password" : "current-password"}
          id="password"
          minLength={6}
          aria-describedby={isSignup ? "password-hint" : undefined}
          name="password"
          onChange={syncPasswordMismatch}
          ref={passwordRef}
          required
          type="password"
        />
        {isSignup && <FieldDescription id="password-hint">6자 이상 입력해 주세요.</FieldDescription>}
      </Field>
      {isSignup && (
        <Field data-invalid={showMismatch || undefined}>
          <FieldLabel htmlFor="passwordConfirm">비밀번호 확인</FieldLabel>
          <Input
            aria-describedby={showMismatch ? "password-confirm-error" : undefined}
            aria-invalid={showMismatch || undefined}
            autoComplete="new-password"
            id="passwordConfirm"
            minLength={6}
            name="passwordConfirm"
            onBlur={() => {
              isConfirmTouched.current = true;
              syncPasswordMismatch();
            }}
            onChange={syncPasswordMismatch}
            ref={passwordConfirmRef}
            required
            type="password"
          />
          {showMismatch && <FieldError id="password-confirm-error">{PASSWORD_MISMATCH_MESSAGE}</FieldError>}
        </Field>
      )}
      {isSignup && (
        <Field>
          <FieldLabel htmlFor="nickname">닉네임</FieldLabel>
          <Input id="nickname" maxLength={20} name="nickname" placeholder="크루에게 보일 이름" required />
        </Field>
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
          className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4"
          href={isSignup ? "/login" : "/signup"}
        >
          {isSignup ? "로그인" : "가입하기"}
        </Link>
      </p>
    </form>
  );
}
