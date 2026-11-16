import type { CrewSummary } from "@/entities/crew/model/crew";
import type { CrewFormAction } from "@/features/crew/model/crew-form";
import { CrewEntryForm } from "@/features/crew/ui/crew-entry-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { CrewList } from "./crew-list";

export function CrewListScreen({
  crews,
  createAction,
  joinAction,
}: {
  crews: CrewSummary[];
  createAction: CrewFormAction;
  joinAction: CrewFormAction;
}) {
  return (
    <PageLayout title="크루">
      <CrewList crews={crews} />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>함께할 크루 만들기</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CrewEntryForm mode="create" action={createAction} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>친구의 크루에 들어가기</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CrewEntryForm mode="join" action={joinAction} />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
