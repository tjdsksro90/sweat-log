import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CrewList } from "./crew-list";

describe("내 크루 목록", () => {
  it("크루가 없으면 가입 방법을 안내한다", () => {
    render(<CrewList crews={[]} />);
    expect(screen.getByText("함께할 크루를 만나 보세요")).toBeInTheDocument();
  });
  it("크루 이름과 구성원 수, 상세 링크를 보여준다", () => {
    render(<CrewList crews={[{ id: "crew-id", name: "아침 러너", memberCount: 3 }]} />);
    expect(screen.getByRole("heading", { name: "아침 러너" })).toBeInTheDocument();
    expect(screen.getByText(/구성원/)).toHaveTextContent("구성원 3명");
    expect(screen.getByRole("link", { name: "아침 러너 크루 보기" })).toHaveAttribute("href", "/crews/crew-id");
  });
});
