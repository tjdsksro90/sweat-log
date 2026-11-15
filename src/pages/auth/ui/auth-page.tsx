import { login, signup } from "@/features/auth";

import { AuthForm } from "./auth-form";

export function LoginPage() {
  return (
    <AuthLayout subtitle="오늘 흘린 땀을 기록해요">
      <AuthForm action={login} mode="login" />
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-10 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-bold text-4xl tracking-tight">
          땀일기<span className="text-primary">.</span>
        </h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </header>
      {children}
    </main>
  );
}
