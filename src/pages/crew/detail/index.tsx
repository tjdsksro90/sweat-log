import { notFound } from "next/navigation";

import { getCrew } from "@/entities/crew/api/queries";
import { getWorkoutPage } from "@/entities/workout/api/server-queries";
import { leaveCrew } from "@/features/crew/api/crew-actions";
import { CopyInviteCode } from "@/features/crew/ui/copy-invite-code";
import { LeaveCrew } from "@/features/crew/ui/leave-crew";
import { requireUser } from "@/shared/api/supabase/require-user";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { CrewFeed } from "./ui/crew-feed";
import { CrewMembers } from "./ui/crew-members";

export async function CrewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ crewId: string }>;
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const { crewId } = await params;
  const crew = await getCrew(crewId);
  if (!crew) notFound();
  const { user } = await requireUser();
  const { cursor } = await searchParams;
  const page = await getWorkoutPage({ crewId, cursor: typeof cursor === "string" ? cursor : undefined });
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
      <CrewFeed crewId={crew.id} page={page} hasCursor={typeof cursor === "string" && Boolean(cursor)} />
      <LeaveCrew crewId={crew.id} isOwner={crew.ownerId === user.id} action={leaveCrew} />
    </PageLayout>
  );
}
