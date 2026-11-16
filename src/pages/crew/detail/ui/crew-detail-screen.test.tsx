import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SAMPLE_WORKOUTS } from "@/entities/workout/model/fixtures";
import { type AppNavigation, AppNavigationProvider } from "@/shared/lib/app-navigation";

import { CrewDetailScreen } from "./crew-detail-screen";

const DEMO: AppNavigation = {
  pathname: "/crews/crew-id",
  push: vi.fn(),
  replace: vi.fn(),
  toHref: (path) => `/demo/app?path=${encodeURIComponent(path)}`,
};

describe("크루 상세 화면", () => {
  it("넘겨받은 데이터로 그리고, 모든 링크를 provider의 주소로 바꾼다", () => {
    render(
      <AppNavigationProvider value={DEMO}>
        <CrewDetailScreen
          crew={{ id: "crew-id", name: "새벽러닝", inviteCode: "ABCDEF12", ownerId: "me", members: [] }}
          page={{ items: SAMPLE_WORKOUTS.slice(0, 1), nextCursor: "next" }}
          hasCursor
          isOwner={false}
          leaveAction={vi.fn()}
        />
      </AppNavigationProvider>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "새벽러닝" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "크루 나가기" })).toBeInTheDocument();
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/demo/app?path=%2Fcrews",
      `/demo/app?path=${encodeURIComponent(`/workouts/${SAMPLE_WORKOUTS[0].id}`)}`,
      "/demo/app?path=%2Fcrews%2Fcrew-id",
      `/demo/app?path=${encodeURIComponent("/crews/crew-id?cursor=next#crew-feed-title")}`,
    ]);
  });
});
