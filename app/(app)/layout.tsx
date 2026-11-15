import type { ReactNode } from "react";

import { requireUser } from "@/shared/api/supabase/require-user";
import { BottomNavigation } from "@/widgets/bottom-navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <>
      {children}
      <BottomNavigation />
    </>
  );
}
