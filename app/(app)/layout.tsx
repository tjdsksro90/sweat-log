import type { ReactNode } from "react";

import { ServiceWorkerRegistration } from "@/app/service-worker-registration";
import { listMyExercises, saveUserExercise } from "@/entities/exercise/api/user-exercise-actions";
import { UserExercisesProvider } from "@/entities/exercise/ui/user-exercises-provider";
import { requireUser } from "@/shared/api/supabase/require-user";
import { BottomNavigation } from "@/widgets/bottom-navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await requireUser();

  return (
    <>
      {/* 기록 폼의 종목 입력칸이 내 종목을 추천·추가한다. 입력칸이 그려질 때만 읽는다.
          캐시 키에 사용자를 넣어 같은 탭에서 다른 사람이 로그인해도 앞사람 종목이 섞이지 않게 한다. */}
      <UserExercisesProvider list={listMyExercises} save={saveUserExercise} queryKey={["user-exercises", user.id]}>
        {children}
      </UserExercisesProvider>
      <BottomNavigation />
      <ServiceWorkerRegistration />
    </>
  );
}
