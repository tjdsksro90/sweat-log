"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

const NOTICE_MS = 3000;

export const UNSUPPORTED_MESSAGE = "체험에서는 지원하지 않아요. 가입하면 쓸 수 있어요.";

const DemoNoticeContext = createContext<(message: string) => void>(() => {});

export const useDemoNotice = () => useContext(DemoNoticeContext);

// 체험에서 막아 둔 동작(로그아웃 등)을 눌렀을 때 하단 탭 위에 잠깐 안내를 띄운다.
export function DemoNoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ message: string; id: number } | null>(null);
  const show = useCallback((message: string) => setNotice({ message, id: Date.now() }), []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <DemoNoticeContext value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 flex justify-center px-5"
        role="status"
      >
        {notice && (
          <p
            key={notice.id}
            className="max-w-md rounded-lg border bg-popover px-4 py-3 text-caption text-popover-foreground shadow-sheet"
          >
            {notice.message}
          </p>
        )}
      </div>
    </DemoNoticeContext>
  );
}
