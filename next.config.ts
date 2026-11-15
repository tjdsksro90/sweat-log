import type { NextConfig } from "next";

/**
 * cacheComponents와 partialPrefetching은 켜지 않는다. 화면 대부분이 로그인 세션(쿠키)을 읽고
 * 데이터 최신화는 TanStack Query가 맡는다.
 * 켜려면 docs/guides/decisions.md에 이유를 남기고 세션을 읽는 화면마다 Suspense 경계를 다시 설계한다.
 */
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
