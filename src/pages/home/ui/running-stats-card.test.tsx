import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SAMPLE_RUNNING_STATS } from "@/entities/workout/model/fixtures";
import { buildRunningStats } from "@/entities/workout/model/running-stats";

import { RunningStatsCard } from "./running-stats-card";

describe("RunningStatsCard", () => {
  it("이번 달 거리, 12개월 막대, 개인 기록을 보여 준다", () => {
    render(<RunningStatsCard stats={SAMPLE_RUNNING_STATS} />);
    expect(screen.getByText("12.80km")).toBeInTheDocument();
    const chart = screen.getByRole("list", { name: "최근 12개월 달린 거리" });
    expect(within(chart).getAllByRole("listitem")).toHaveLength(12);
    expect(within(chart).getByRole("listitem", { name: "2026년 11월 12.80km, 3회" })).toBeInTheDocument();
    expect(screen.getByText(/가장 많이 달린 달은 2026년 8월, 30.50km/)).toBeInTheDocument();

    // 3km 14분 → 4'40"/km, 기록 화면으로 이동할 수 있다.
    const best = screen.getByRole("link", { name: /^최고 페이스/ });
    expect(best).toHaveAttribute("href", "/workouts/run-best");
    expect(best).toHaveTextContent(`4'40"`);
    expect(screen.getByRole("link", { name: /최장 거리/ })).toHaveTextContent("9.10km");
    expect(screen.getByRole("link", { name: /최장 시간/ })).toHaveTextContent("55:00");
    // 10km 이상이 없으면 링크 없이 안내만 한다.
    expect(screen.queryByRole("link", { name: /10km 이상/ })).not.toBeInTheDocument();
    expect(screen.getByText("10km 이상 달리면 기록돼요")).toBeInTheDocument();
  });

  it("기록이 하나도 없으면 첫 러닝을 안내한다", () => {
    render(<RunningStatsCard stats={buildRunningStats({ hasWorkouts: false, runs: [], today: "2026-11-16" })} />);
    expect(screen.getByRole("heading", { name: "첫 러닝을 남겨 볼까요?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "러닝 기록하기" })).toHaveAttribute("href", "/workouts/new?kind=run");
    expect(screen.queryByRole("list", { name: /달린 거리/ })).not.toBeInTheDocument();
  });

  it("다른 운동만 있고 러닝이 없으면 러닝이 없다고 알려 준다", () => {
    render(<RunningStatsCard stats={buildRunningStats({ hasWorkouts: true, runs: [], today: "2026-11-16" })} />);
    expect(screen.getByRole("heading", { name: "아직 러닝 기록이 없어요" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "러닝 기록하기" })).toBeInTheDocument();
  });

  it("최근 12개월에 러닝이 없어도 예전 개인 기록은 보여 준다", () => {
    const stats = buildRunningStats({
      hasWorkouts: true,
      today: "2026-11-16",
      runs: [
        {
          workoutId: "old",
          workoutDate: "2024-05-01",
          createdAt: "2024-05-01T00:00:00Z",
          distanceMeters: 5000,
          durationSeconds: 1500,
        },
      ],
    });
    render(<RunningStatsCard stats={stats} />);
    expect(screen.getByText("0.00km")).toBeInTheDocument();
    expect(screen.getByText("최근 12개월에는 러닝 기록이 없어요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^5km 이상 최고 페이스/ })).toHaveAttribute("href", "/workouts/old");
  });
});
