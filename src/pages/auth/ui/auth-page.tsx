import Link from "next/link";

import { login, signup } from "@/features/auth";

import { AuthForm } from "./auth-form";

export function LoginPage() {
  return (
    <AuthLayout subtitle="오늘 흘린 땀을 기록해요">
      <AuthForm action={login} mode="login" />
      <p className="-mt-6 text-center text-muted-foreground text-sm">
        <Link
          className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4"
          href="/demo"
        >
          가입 없이 둘러보기
        </Link>
      </p>
    </AuthLayout>
  );
}

export function SignupPage() {
  return (
    <AuthLayout subtitle="크루와 함께 땀을 기록해요">
      <AuthForm action={signup} mode="signup" />
    </AuthLayout>
  );
}

function AuthLayout({ children, subtitle }: { children: React.ReactNode; subtitle: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-10 px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+3rem)]">
      <header className="flex flex-col gap-2">
        <h1 className="font-bold text-4xl tracking-tight">
          땀일기<span className="text-foreground">.</span>
        </h1>
        <p className="text-body text-muted-foreground">{subtitle}</p>
      </header>
      {children}
    </main>
  );
}
