"use client";

import { RouteError } from "@/widgets/route-error";

export default function CrewError({ retry }: { retry: () => void }) {
  return <RouteError pageTitle="크루" title="크루를 불러오지 못했어요" retry={retry} />;
}
