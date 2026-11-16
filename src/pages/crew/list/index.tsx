import { getMyCrews } from "@/entities/crew/api/queries";
import { createCrew, joinCrew } from "@/features/crew/api/crew-actions";

import { CrewListScreen } from "./ui/crew-list-screen";

export async function CrewListPage() {
  const crews = await getMyCrews();
  return <CrewListScreen crews={crews} createAction={createCrew} joinAction={joinCrew} />;
}
