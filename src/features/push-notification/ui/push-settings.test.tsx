import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { BrowserSubscription, PushBrowser } from "../lib/browser-push";
import type { PushAvailability } from "../model/push-support";
import { PushSettings, type PushSettingsActions } from "./push-settings";

const ENDPOINT = "https://push.test/me";

const makeSubscription = (): BrowserSubscription => ({
  endpoint: ENDPOINT,
  toJSON: () => ({ endpoint: ENDPOINT, keys: { auth: "a", p256dh: "p" } }),
  unsubscribe: vi.fn(async () => true),
});

const makeBrowser = ({
  availability = "available",
  subscription = null,
  permission = "granted",
}: {
  availability?: PushAvailability;
  subscription?: BrowserSubscription | null;
  permission?: NotificationPermission;
} = {}): PushBrowser => {
  let current = subscription;
  return {
    getAvailability: () => availability,
    getSubscription: async () => current,
    requestPermission: async () => permission,
    subscribe: async () => {
      current = makeSubscription();
      return current;
    },
  };
};

const makeActions = (overrides: Partial<PushSettingsActions> = {}): PushSettingsActions => ({
  deleteSubscription: vi.fn(async () => ({ ok: true as const })),
  isMySubscription: vi.fn(async () => true),
  saveSubscription: vi.fn(async () => ({ ok: true as const })),
  ...overrides,
});

describe("PushSettings", () => {
  it("권한을 받으면 구독을 서버에 저장하고 켜짐으로 바뀐다", async () => {
    const actions = makeActions();
    render(<PushSettings actions={actions} browser={makeBrowser()} />);

    await userEvent.click(await screen.findByRole("button", { name: "알림 켜기" }));

    expect(actions.saveSubscription).toHaveBeenCalledWith({ endpoint: ENDPOINT, keys: { auth: "a", p256dh: "p" } });
    expect(await screen.findByRole("button", { name: "알림 끄기" })).toBeInTheDocument();
  });

  it("끄면 서버 구독을 지우고 브라우저 구독도 끊는다", async () => {
    const subscription = makeSubscription();
    const actions = makeActions();
    render(<PushSettings actions={actions} browser={makeBrowser({ subscription })} />);

    await userEvent.click(await screen.findByRole("button", { name: "알림 끄기" }));

    expect(actions.deleteSubscription).toHaveBeenCalledWith(ENDPOINT);
    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "알림 켜기" })).toBeInTheDocument();
  });

  it("브라우저에 남은 구독이 다른 계정 것이면 꺼짐으로 보인다", async () => {
    const actions = makeActions({ isMySubscription: vi.fn(async () => false) });
    render(<PushSettings actions={actions} browser={makeBrowser({ subscription: makeSubscription() })} />);

    expect(await screen.findByRole("button", { name: "알림 켜기" })).toBeInTheDocument();
  });

  it("권한을 거부하면 브라우저 설정 안내를 보여 주고 버튼을 숨긴다", async () => {
    const actions = makeActions();
    render(<PushSettings actions={actions} browser={makeBrowser({ permission: "denied" })} />);

    await userEvent.click(await screen.findByRole("button", { name: "알림 켜기" }));

    expect(await screen.findByText(/알림이 차단돼 있어요/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(actions.saveSubscription).not.toHaveBeenCalled();
  });

  it("서버 저장에 실패하면 브라우저 구독을 되돌리고 오류를 알린다", async () => {
    const actions = makeActions({ saveSubscription: vi.fn(async () => ({ ok: false as const })) });
    render(<PushSettings actions={actions} browser={makeBrowser()} />);

    await userEvent.click(await screen.findByRole("button", { name: "알림 켜기" }));

    expect(await screen.findByRole("status")).toHaveTextContent("알림 설정을 바꾸지 못했어요");
    expect(screen.getByRole("button", { name: "알림 켜기" })).toBeInTheDocument();
  });

  it.each([
    ["ios-install", /홈 화면에 추가한 땀일기에서만/],
    ["unsupported", /알림을 지원하지 않아요/],
    ["denied", /알림이 차단돼 있어요/],
  ] as const)("%s 상태에서는 안내만 보여 준다", async (availability, message) => {
    render(<PushSettings actions={makeActions()} browser={makeBrowser({ availability })} />);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
