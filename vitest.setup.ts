import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// `server-only`는 서버 번들이 아닌 곳에서 import하면 오류를 던진다.
// 컴포넌트가 index.ts를 거쳐 Server Action 파일까지 끌어와도 테스트가 깨지지 않게 비워 둔다.
vi.mock("server-only", () => ({}));

afterEach(() => {
  cleanup();
});
