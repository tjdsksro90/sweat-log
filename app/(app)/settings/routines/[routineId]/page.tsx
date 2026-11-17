import { EditRoutinePage } from "@/pages/routine/edit";

// PageProps는 next typegen 뒤에만 생겨서, 생성물 없이 tsc를 돌려도 통과하도록 직접 적는다.
export default async function Page({ params }: { params: Promise<{ routineId: string }> }) {
  const { routineId } = await params;
  return <EditRoutinePage routineId={routineId} />;
}
