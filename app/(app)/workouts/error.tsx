"use client";

import { RouteError } from "@/widgets/route-error";

export default function WorkoutListError({ retry }: { retry: () => void }) {
  return <RouteError pageTitle="기록" title="기록을 불러오지 못했어요" retry={retry} />;
}
