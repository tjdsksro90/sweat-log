import type { ReactNode } from "react";

type PageLayoutProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

// 탭 화면 공통 틀. 하단 탭 높이만큼 아래 여백을 둔다.
export function PageLayout({ action, children, title }: PageLayoutProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-28">
      <header className="flex items-center justify-between">
        <h1 className="font-bold text-2xl tracking-tight">{title}</h1>
        {action}
      </header>
      {children}
    </main>
  );
}
