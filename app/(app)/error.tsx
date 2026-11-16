"use client";

import { RouteError } from "@/widgets/route-error";

export default function AppError({ retry }: { retry: () => void }) {
  return <RouteError pageTitle="땀일기" title="화면을 불러오지 못했어요" retry={retry} />;
}
