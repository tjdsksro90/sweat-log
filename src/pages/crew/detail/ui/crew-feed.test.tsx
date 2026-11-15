import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SAMPLE_WORKOUTS } from "@/entities/workout/model/fixtures";

import { CrewFeed } from "./crew-feed";

describe("크루 피드", () => {
  it("기록 카드를 상세로 연결하고 다음 커서를 링크에 전달한다", () => {
    render(
      <CrewFeed crewId="crew-id" page={{ items: SAMPLE_WORKOUTS, nextCursor: "next/cursor" }} hasCursor={false} />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(SAMPLE_WORKOUTS.length);
    expect(screen.getByRole("link", { name: "한강 새벽 러닝" })).toHaveAttribute(
      "href",
      `/workouts/${SAMPLE_WORKOUTS[0].id}`,
    );
    expect(screen.queryByRole("link", { name: "최신 기록으로" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "이전 기록 보기" })).toHaveAttribute(
      "href",
      "/crews/crew-id?cursor=next%2Fcursor#crew-feed-title",
    );
  });
  it("첫 페이지가 비면 공유를 안내한다", () => {
    render(<CrewFeed crewId="crew-id" page={{ items: [], nextCursor: null }} hasCursor={false} />);
    expect(screen.getByText("아직 함께 남긴 기록이 없어요")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
  it("이전 페이지가 비면 최신 기록으로 돌아갈 수 있다", () => {
    render(<CrewFeed crewId="crew-id" page={{ items: [], nextCursor: null }} hasCursor />);
    expect(screen.getByText("이전 기록이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "최신 기록으로" })).toHaveAttribute("href", "/crews/crew-id");
  });
});
