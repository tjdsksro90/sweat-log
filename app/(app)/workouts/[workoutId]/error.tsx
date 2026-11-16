"use client";

import { RouteError } from "@/widgets/route-error";

export default function WorkoutDetailError({ retry }: { retry: () => void }) {
  return <RouteError pageTitle="운동 기록" title="운동 기록을 불러오지 못했어요" retry={retry} />;
}
