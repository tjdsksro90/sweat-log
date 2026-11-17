import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import { WorkoutPhotoGallery } from "./workout-photo-gallery";

const PHOTOS = [
  { id: "p1", url: "https://storage/p1?token=a", width: 1600, height: 1200 },
  { id: "p2", url: "https://storage/p2?token=b", width: 1200, height: 1600 },
];

// jsdom의 <dialog>에는 showModal·close가 없을 수 있다.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

describe("WorkoutPhotoGallery", () => {
  it("사진이 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<WorkoutPhotoGallery photos={[]} label="한강 러닝" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("사진마다 대체 텍스트와 저장된 크기를 준다", () => {
    render(<WorkoutPhotoGallery photos={PHOTOS} label="한강 러닝" />);
    const first = screen.getByRole("img", { name: "한강 러닝 사진 1/2" });
    expect(first).toHaveAttribute("width", "1600");
    expect(first).toHaveAttribute("height", "1200");
    expect(screen.getByRole("img", { name: "한강 러닝 사진 2/2" })).toBeInTheDocument();
  });

  it("누르면 크게 보고, 다음 사진으로 넘기고, 닫는다", async () => {
    const user = userEvent.setup();
    render(<WorkoutPhotoGallery photos={PHOTOS} label="한강 러닝" />);

    await user.click(screen.getByRole("button", { name: "한강 러닝 사진 1/2 크게 보기" }));
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveTextContent("1 / 2");

    await user.click(screen.getByRole("button", { name: "다음 사진", hidden: true }));
    expect(dialog).toHaveTextContent("2 / 2");
    await user.click(screen.getByRole("button", { name: "다음 사진", hidden: true }));
    expect(dialog).toHaveTextContent("1 / 2");

    await user.click(screen.getByRole("button", { name: "닫기", hidden: true }));
    expect(dialog).not.toHaveAttribute("open");
  });
});
