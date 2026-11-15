import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CrewMembers } from "./crew-members";

describe("크루 구성원", () => {
  it("이름과 크루장을 표시하고 null 닉네임의 문구는 화면에서 정한다", () => {
    render(
      <CrewMembers
        members={[
          { userId: "owner", nickname: "호준", isOwner: true },
          { userId: "friend", nickname: null, isOwner: false },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "구성원 2명" })).toBeInTheDocument();
    expect(screen.getByText("호준")).toBeInTheDocument();
    expect(screen.getByText("크루 친구")).toBeInTheDocument();
    expect(screen.getAllByText("크루장")).toHaveLength(1);
  });
});
