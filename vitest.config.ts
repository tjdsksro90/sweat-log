import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import { fileURLToPath } from "node:url";

// tsconfig의 `@/*` → `src/*`와 같은 별칭
const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      {
        // 순수 함수(model/ 등)는 브라우저 없이 빠르게 돈다.
        extends: true,
        test: { name: "unit", include: ["src/**/*.test.ts"], environment: "node" },
      },
      {
        // 컴포넌트는 jsdom에서 렌더링한다.
        extends: true,
        test: {
          name: "component",
          include: ["src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
