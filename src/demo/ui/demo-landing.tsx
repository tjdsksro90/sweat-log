import Link from "next/link";

import { Button } from "@/shared/ui/button";

import { DemoPreview } from "./demo-preview";

// `/demo`: 체험 소개와 휴대폰 크기 체험 창.
export function DemoLanding() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col items-center gap-8 px-5 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] md:flex-row md:items-center md:justify-center md:gap-12">
      <section className="flex w-full max-w-md flex-col gap-4">
        <h1 className="font-bold text-4xl tracking-tight">
          땀일기<span className="text-foreground">.</span>
        </h1>
        <p className="text-body text-muted-foreground">
          가입 없이 샘플 기록으로 땀일기를 써 보세요. 러닝과 헬스를 기록하고, 크루 친구들의 기록에 응원 댓글을 남길 수
          있어요.
        </p>
        <p className="text-caption text-muted-foreground">
          체험 데이터는 이 탭에만 저장되고, 탭을 닫으면 샘플로 돌아가요.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button role="link" nativeButton={false} render={<Link href="/signup" />}>
            가입하고 시작하기
          </Button>
          <Button variant="ghost" role="link" nativeButton={false} render={<Link href="/login" />}>
            로그인
          </Button>
        </div>
      </section>
      <DemoPreview />
    </main>
  );
}
