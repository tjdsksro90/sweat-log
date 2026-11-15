import { UsersThreeIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import type { CrewSummary } from "@/entities/crew/model/crew";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";

export function CrewList({ crews }: { crews: CrewSummary[] }) {
  if (!crews.length)
    return (
      <EmptyState
        icon={<UsersThreeIcon size={28} />}
        headingLevel={2}
        title="함께할 크루를 만나 보세요"
        description="아래에서 크루를 만들거나 친구에게 받은 초대 코드로 가입해 보세요."
      />
    );
  return (
    <section aria-labelledby="my-crews-title" className="flex flex-col gap-4">
      <h2 id="my-crews-title" className="font-semibold text-title">
        내 크루
      </h2>
      <ul className="flex flex-col gap-3">
        {crews.map((crew) => (
          <li key={crew.id}>
            <Card size="sm">
              <CardContent className="flex flex-col gap-3">
                <h3 className="break-words font-semibold text-body">{crew.name}</h3>
                <p className="text-caption text-muted-foreground">
                  구성원 <span className="tabular-nums">{crew.memberCount}</span>명
                </p>
                <Button
                  role="link"
                  variant="outline"
                  render={<Link href={`/crews/${crew.id}`} />}
                  nativeButton={false}
                  aria-label={`${crew.name} 크루 보기`}
                >
                  크루 보기
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
