import type { ReactNode } from "react";

import type { Metadata, Viewport } from "next";

import { QueryProvider } from "@/shared/lib/react-query/query-provider";
import { THEME_INIT_SCRIPT } from "@/shared/lib/theme/theme";
import { ThemeProvider } from "@/shared/lib/theme/theme-provider";

import "@/app/fonts/pretendard/pretendard.css";
import "@/app/fonts/pretendard/pretendard-fallback.css";
import "@/app/styles/globals.css";

export const metadata: Metadata = {
  title: "땀일기",
  description: "러닝과 헬스, 크루와 함께 흘린 땀을 기록하는 운동 일기",
  applicationName: "땀일기",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "땀일기" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 첫 페인트 전 실행하는 고정 스크립트이며 사용자 입력을 포함하지 않는다. */}
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
