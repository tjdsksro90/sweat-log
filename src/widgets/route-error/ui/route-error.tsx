"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";

import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

// error.tsx가 그리는 공통 오류 화면. retry()는 세그먼트를 다시 불러와 그린다(reset은 오류 상태만 지운다).
export function RouteError({ pageTitle, title, retry }: { pageTitle: string; title: string; retry: () => void }) {
  return (
    <PageLayout title={pageTitle}>
      <EmptyState
        icon={<WarningCircleIcon size={28} />}
        headingLevel={2}
        title={title}
        description="잠시 후 다시 시도해 주세요."
        action={<Button onClick={() => retry()}>다시 시도</Button>}
      />
    </PageLayout>
  );
}
