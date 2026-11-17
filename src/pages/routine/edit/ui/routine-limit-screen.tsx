import { ClipboardTextIcon } from "@phosphor-icons/react/ssr";

import { ROUTINE_LIMITS } from "@/entities/routine/model/routine";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

/**
 * 루틴이 상한(30개)에 닿았을 때 새 루틴 화면 대신 보여 준다.
 * 목록 화면은 "새 루틴" 버튼을 숨기지만, 기록 상세의 "이 구성으로 루틴 만들기"로도 들어올 수 있어서
 * 다 적고 저장할 때가 되어서야 막히지 않게 들어올 때 알린다.
 */
export function RoutineLimitScreen() {
  return (
    <PageLayout title="새 루틴">
      <EmptyState
        icon={<ClipboardTextIcon size={28} />}
        headingLevel={2}
        title={`루틴이 ${ROUTINE_LIMITS.perUser}개로 가득 찼어요`}
        description="새 루틴을 만들려면 내 루틴에서 안 쓰는 루틴을 먼저 지워 주세요."
        action={
          <Button role="link" render={<AppLink href="/settings/routines" />} nativeButton={false}>
            내 루틴으로
          </Button>
        }
      />
    </PageLayout>
  );
}
