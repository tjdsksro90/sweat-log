import type { ReactNode } from "react";

import type { Metadata, Viewport } from "next";

import { QueryProvider } from "@/shared/lib/react-query/query-provider";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafbf9" },
    { media: "(prefers-color-scheme: dark)", color: "#121411" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
