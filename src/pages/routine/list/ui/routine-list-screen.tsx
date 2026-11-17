import { ArrowLeftIcon, ClipboardTextIcon, PlusIcon } from "@phosphor-icons/react/ssr";

import { describeRoutine, ROUTINE_LIMITS, type Routine } from "@/entities/routine/model/routine";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

// 설정 > 내 루틴. 실제 앱은 서버에서 읽은 목록을, 체험 데모는 sessionStorage 저장소의 목록을 넘긴다.
export function RoutineListScreen({ routines }: { routines: Routine[] }) {
  const isFull = routines.length >= ROUTINE_LIMITS.perUser;

  return (
    <PageLayout
      title="내 루틴"
      action={
        isFull ? undefined : (
          <Button role="link" variant="primary" render={<AppLink href="/settings/routines/new" />} nativeButton={false}>
            <PlusIcon />새 루틴
          </Button>
        )
      }
    >
      <Button
        className="self-start"
        variant="ghost"
        render={<AppLink href="/settings" />}
        nativeButton={false}
        role="link"
      >
        <ArrowLeftIcon />
        설정
      </Button>
      <p className="text-body text-muted-foreground">
        자주 하는 헬스 구성을 저장해 두면, 기록을 쓸 때 상세 단계에서 불러와 바로 채울 수 있어요.
      </p>
      {routines.length === 0 ? (
        <EmptyState
          icon={<ClipboardTextIcon size={28} />}
          headingLevel={2}
          title="아직 루틴이 없어요"
          description="새 루틴을 만들거나, 헬스 기록 상세에서 ‘이 구성으로 루틴 만들기’를 눌러 보세요."
        />
      ) : (
        <section aria-labelledby="routine-list-title" className="flex flex-col gap-3">
          <h2 id="routine-list-title" className="sr-only">
            저장한 루틴
          </h2>
          <ul className="flex flex-col gap-3">
            {routines.map((routine) => (
              <li key={routine.id}>
                <Card size="sm">
                  <CardContent className="flex flex-col gap-3">
                    <h3 className="break-words font-semibold text-body">{routine.name}</h3>
                    <p className="break-words text-caption text-muted-foreground">{describeRoutine(routine)}</p>
                    <Button
                      role="link"
                      variant="outline"
                      render={<AppLink href={`/settings/routines/${routine.id}`} />}
                      nativeButton={false}
                      aria-label={`${routine.name} 루틴 고치기`}
                    >
                      고치기
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {isFull && (
            <p className="text-caption text-muted-foreground">
              루틴은 {ROUTINE_LIMITS.perUser}개까지 저장할 수 있어요. 새로 만들려면 안 쓰는 루틴을 지워 주세요.
            </p>
          )}
        </section>
      )}
    </PageLayout>
  );
}
