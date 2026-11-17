import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEMO_PRERENDER_ID } from "../model/prerender-guard";
import { createDemoStore } from "../store";
import { DemoApp } from "./demo-app";
import { notifyDemoLocationChange, useDemoSearch, useHydrated } from "./demo-location";

vi.mock("next/navigation", () => ({
  usePathname: () => "/demo/app",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function Probe() {
  const search = useDemoSearch();
  const hydrated = useHydrated();
  return <p>{`${hydrated ? "hydrated" : "server"}:${search || "(없음)"}`}</p>;
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
  sessionStorage.clear();
});

describe("useDemoSearch", () => {
  it("서버 렌더에서는 주소와 상관없이 빈 검색어와 hydration 전 상태를 준다", () => {
    window.history.replaceState(null, "", "/demo/app?path=%2Fworkouts");
    expect(renderToString(<Probe />)).toContain("server:(없음)");
  });

  it("pushState 뒤 알리거나 뒤로 가면 새 주소로 다시 그린다", () => {
    window.history.replaceState(null, "", "/demo/app");
    render(<Probe />);
    expect(screen.getByText("hydrated:(없음)")).toBeInTheDocument();

    window.history.pushState(null, "", "/demo/app?path=%2Fcrews");
    // 알리기 전에는 history가 바뀐 것을 모른다.
    expect(screen.getByText("hydrated:(없음)")).toBeInTheDocument();
    act(() => notifyDemoLocationChange());
    expect(screen.getByText("hydrated:?path=%2Fcrews")).toBeInTheDocument();

    window.history.replaceState(null, "", "/demo/app");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(screen.getByText("hydrated:(없음)")).toBeInTheDocument();
  });
});

describe("DemoApp 미리 그리기와 hydration", () => {
  const renderApp = () => (
    <QueryClientProvider client={new QueryClient()}>
      <DemoApp prerenderedHome={createDemoStore({ storage: () => null }).readHome()} />
    </QueryClientProvider>
  );

  it("서버는 홈을 그리고, ?path=/workouts면 hydration 뒤 오류 없이 기록 화면으로 바뀐다", async () => {
    window.history.replaceState(null, "", "/demo/app?path=%2Fworkouts");
    const container = document.createElement("div");
    container.innerHTML = renderToString(renderApp());
    document.body.append(container);
    expect(container.querySelector("h1")?.textContent).toBe("홈");
    expect(container.querySelector(`#${DEMO_PRERENDER_ID}`)).not.toBeNull();

    const onRecoverableError = vi.fn();
    const root = await act(async () => hydrateRoot(container, renderApp(), { onRecoverableError }));
    await waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("기록"));
    expect(container.querySelector(`#${DEMO_PRERENDER_ID}`)).toBeNull();
    expect(onRecoverableError).not.toHaveBeenCalled();
    act(() => root.unmount());
    container.remove();
  });

  it("처음 방문의 홈은 hydration 뒤에도 서버가 그린 숫자 노드를 그대로 쓴다", async () => {
    window.history.replaceState(null, "", "/demo/app");
    const container = document.createElement("div");
    container.innerHTML = renderToString(renderApp());
    document.body.append(container);
    const statsBefore = [...container.querySelectorAll("h1, p span")];

    const onRecoverableError = vi.fn();
    const root = await act(async () => hydrateRoot(container, renderApp(), { onRecoverableError }));
    expect(container.querySelector(`#${DEMO_PRERENDER_ID}`)).toBeNull();
    const statsAfter = [...container.querySelectorAll("h1, p span")];
    expect(statsAfter).toHaveLength(statsBefore.length);
    statsAfter.forEach((node, index) => {
      expect(node).toBe(statsBefore[index]);
      expect(node.isConnected).toBe(true);
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    act(() => root.unmount());
    container.remove();
  });
});
