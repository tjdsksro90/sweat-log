import { getMyRoutines } from "@/entities/routine/api/server-queries";

import { RoutineListScreen } from "./ui/routine-list-screen";

export async function RoutineListPage() {
  const routines = await getMyRoutines();
  return <RoutineListScreen routines={routines} />;
}
