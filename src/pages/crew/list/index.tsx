import { getMyCrews } from "@/entities/crew/api/queries";
import { createCrew, joinCrew } from "@/features/crew/api/crew-actions";
import { CrewEntryForm } from "@/features/crew/ui/crew-entry-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageLayout } from "@/shared/ui/layouts/page-layout";

import { CrewList } from "./ui/crew-list";

export async function CrewListPage() {
  const crews = await getMyCrews();
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
          <CrewEntryForm mode="create" action={createCrew} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>친구의 크루에 들어가기</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CrewEntryForm mode="join" action={joinCrew} />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
