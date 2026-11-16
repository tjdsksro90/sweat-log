import { notFound } from "next/navigation";

import { getCrew } from "@/entities/crew/api/queries";
import { getWorkoutPage } from "@/entities/workout/api/server-queries";
import { leaveCrew } from "@/features/crew/api/crew-actions";
import { requireUser } from "@/shared/api/supabase/require-user";

import { CrewDetailScreen } from "./ui/crew-detail-screen";

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
    <CrewDetailScreen
      crew={crew}
      page={page}
      hasCursor={typeof cursor === "string" && Boolean(cursor)}
      isOwner={crew.ownerId === user.id}
      leaveAction={leaveCrew}
    />
  );
}
