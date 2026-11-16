import type { Metadata } from "next";

import { DemoLanding } from "@/demo/ui/demo-landing";

export const metadata: Metadata = {
  title: "땀일기 체험",
  description: "가입 없이 샘플 기록으로 땀일기를 써 보세요.",
};

export default function DemoPage() {
  return <DemoLanding />;
}
