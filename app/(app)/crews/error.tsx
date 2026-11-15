"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";

import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

export default function CrewError({ reset }: { reset: () => void }) {
  return (
    <PageLayout title="크루">
      <EmptyState
        icon={<WarningCircleIcon size={28} />}
        headingLevel={2}
        title="크루를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
        action={<Button onClick={reset}>다시 시도</Button>}
      />
    </PageLayout>
  );
}
