import { EditWorkoutPage } from "@/pages/workout/edit";

// PageProps는 next typegen 뒤에만 생겨서, 생성물 없이 tsc를 돌려도 통과하도록 직접 적는다.
export default async function Page({ params }: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = await params;
  return <EditWorkoutPage workoutId={workoutId} />;
}
