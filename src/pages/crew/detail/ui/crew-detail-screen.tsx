import type { CrewDetail } from "@/entities/crew/model/crew";
import type { WorkoutPage } from "@/entities/workout/model/contracts";
import type { CrewFormAction } from "@/features/crew/model/crew-form";
import { CopyInviteCode } from "@/features/crew/ui/copy-invite-code";
import { LeaveCrew } from "@/features/crew/ui/leave-crew";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { CrewFeed } from "./crew-feed";
import { CrewMembers } from "./crew-members";

type CrewDetailScreenProps = {
  crew: CrewDetail;
  page: WorkoutPage;
  hasCursor: boolean;
  isOwner: boolean;
  leaveAction: CrewFormAction;
};

export function CrewDetailScreen({ crew, page, hasCursor, isOwner, leaveAction }: CrewDetailScreenProps) {
  return (
    <PageLayout title={crew.name}>
      <Button variant="ghost" role="link" render={<AppLink href="/crews" />} nativeButton={false}>
        크루 목록으로
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>친구 초대하기</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-caption text-muted-foreground">이 코드를 친구에게 알려 주세요.</p>
          <p
            className="select-all break-all font-bold font-mono text-title tracking-widest"
            aria-label={`초대 코드 ${crew.inviteCode}`}
          >
            {crew.inviteCode}
          </p>
          <CopyInviteCode code={crew.inviteCode} />
        </CardContent>
      </Card>
      <CrewMembers members={crew.members} />
      <CrewFeed crewId={crew.id} page={page} hasCursor={hasCursor} />
      <LeaveCrew crewId={crew.id} isOwner={isOwner} action={leaveAction} />
    </PageLayout>
  );
}
