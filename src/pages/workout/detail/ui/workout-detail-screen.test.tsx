import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SAMPLE_STRENGTH_DETAIL } from "@/entities/workout/model/fixtures";
import { type AppNavigation, AppNavigationProvider } from "@/shared/lib/app-navigation";

import { WorkoutDetailScreen } from "./workout-detail-screen";

const DEMO: AppNavigation = {
  pathname: `/workouts/${SAMPLE_STRENGTH_DETAIL.id}`,
  push: vi.fn(),
  replace: vi.fn(),
  toHref: (path) => `/demo/app?path=${encodeURIComponent(path)}`,
};

describe("기록 상세 화면", () => {
  it("목록·수정 링크를 provider의 주소로 바꾸고 댓글 자리를 채운다", () => {
    render(
      <AppNavigationProvider value={DEMO}>
        <WorkoutDetailScreen workout={SAMPLE_STRENGTH_DETAIL} comments={<p>댓글 자리</p>} />
      </AppNavigationProvider>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "운동 기록" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← 기록 목록" })).toHaveAttribute("href", "/demo/app?path=%2Fworkouts");
    expect(screen.getByRole("link", { name: "수정" })).toHaveAttribute(
      "href",
      `/demo/app?path=${encodeURIComponent(`/workouts/${SAMPLE_STRENGTH_DETAIL.id}/edit`)}`,
    );
    expect(screen.getByText("댓글 자리")).toBeInTheDocument();
  });
});
