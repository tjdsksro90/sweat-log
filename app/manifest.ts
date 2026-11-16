import type { MetadataRoute } from "next";

// 색은 app/layout.tsx의 라이트 themeColor와 맞춘다. 다크 값은 manifest가 한 가지 색만 받아 layout의 meta가 맡는다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "땀일기",
    short_name: "땀일기",
    description: "러닝과 헬스, 크루와 함께 흘린 땀을 기록하는 운동 일기",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafbf9",
    theme_color: "#fafbf9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
