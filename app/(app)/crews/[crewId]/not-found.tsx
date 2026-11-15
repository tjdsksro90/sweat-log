import { UsersThreeIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

export default function CrewNotFound() {
  return (
    <PageLayout title="크루">
      <EmptyState
        icon={<UsersThreeIcon size={28} />}
        headingLevel={2}
        title="크루를 찾을 수 없어요"
        description="가입한 크루인지 확인하거나 초대 코드로 들어가 주세요."
        action={
          <Button role="link" render={<Link href="/crews" />} nativeButton={false}>
            크루 목록으로
          </Button>
        }
      />
    </PageLayout>
  );
}
