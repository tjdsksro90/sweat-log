"use client";

import { useEffect, useId, useState } from "react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

import { type BrowserSubscription, browserPush, type PushBrowser } from "../lib/browser-push";
import type { PushSubscriptionResult } from "../model/subscription";

export type PushSettingsActions = {
  saveSubscription: (subscription: unknown) => Promise<PushSubscriptionResult>;
  deleteSubscription: (endpoint: string) => Promise<PushSubscriptionResult>;
  isMySubscription: (endpoint: string) => Promise<boolean>;
};

type Status = "checking" | "on" | "off" | "busy" | "ios-install" | "unsupported" | "denied";

const DESCRIPTION: Record<Status, string> = {
  busy: "잠시만 기다려 주세요.",
  checking: "알림 설정을 확인하고 있어요.",
  denied:
    "이 브라우저에서 땀일기 알림이 차단돼 있어요. 주소창의 사이트 설정이나 기기 설정에서 알림을 허용한 뒤 이 화면을 다시 열어 주세요.",
  "ios-install":
    "iPhone·iPad에서는 홈 화면에 추가한 땀일기에서만 알림을 받을 수 있어요. Safari 공유 버튼에서 '홈 화면에 추가'를 누른 뒤 그 앱에서 켜 주세요.",
  off: "크루에 새 기록이 올라오거나, 친구가 나를 함께한 친구로 넣거나, 내 기록에 댓글이 달리면 알려 드려요.",
  on: "새 기록과 댓글 알림을 받고 있어요.",
  unsupported: "이 브라우저는 알림을 지원하지 않아요. 최신 Chrome, Edge, Firefox, Safari에서 켤 수 있어요.",
};

const ERROR_MESSAGE = "알림 설정을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.";

export function PushSettings({
  actions,
  browser = browserPush,
}: {
  actions: PushSettingsActions;
  browser?: PushBrowser;
}) {
  const id = useId();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async (): Promise<Status> => {
      const availability = browser.getAvailability();
      if (availability !== "available") return availability;
      const subscription = await browser.getSubscription();
      // 이 브라우저에 다른 계정의 구독이 남아 있을 수 있어 내 것인지 서버에 묻는다.
      if (!subscription) return "off";
      return (await actions.isMySubscription(subscription.endpoint)) ? "on" : "off";
    };
    check()
      .catch((): Status => "off")
      .then((next) => {
        if (!cancelled) setStatus(next);
      });
    return () => {
      cancelled = true;
    };
  }, [actions, browser]);

  const turnOn = async () => {
    const permission = await browser.requestPermission();
    if (permission === "denied") return "denied";
    if (permission !== "granted") return "off";

    let subscription: BrowserSubscription;
    try {
      subscription = await browser.subscribe();
    } catch {
      setError(ERROR_MESSAGE);
      return "off";
    }
    const result = await actions.saveSubscription(subscription.toJSON());
    if (result.ok) return "on";
    // 서버에 저장하지 못한 구독은 알림이 오지 않으니 브라우저에서도 끊는다.
    await subscription.unsubscribe().catch(() => false);
    setError(ERROR_MESSAGE);
    return "off";
  };

  const turnOff = async () => {
    const subscription = await browser.getSubscription();
    if (!subscription) return "off";
    const result = await actions.deleteSubscription(subscription.endpoint);
    if (!result.ok) {
      setError(ERROR_MESSAGE);
      return "on";
    }
    await subscription.unsubscribe().catch(() => false);
    return "off";
  };

  const toggle = async () => {
    const wasOn = status === "on";
    setError(null);
    setStatus("busy");
    try {
      setStatus(await (wasOn ? turnOff() : turnOn()));
    } catch {
      setError(ERROR_MESSAGE);
      setStatus(wasOn ? "on" : "off");
    }
  };

  const canToggle = status === "on" || status === "off";
  const pending = status === "checking" || status === "busy";

  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 id={`${id}-title`} className="font-semibold text-title">
          알림
        </h2>
        <p id={`${id}-description`} className="text-caption text-muted-foreground">
          {DESCRIPTION[status]}
        </p>
        {(canToggle || pending) && (
          <Button
            className="w-full"
            variant={status === "on" ? "outline" : "primary"}
            disabled={!canToggle}
            aria-describedby={`${id}-description`}
            onClick={toggle}
          >
            {pending ? "확인 중…" : status === "on" ? "알림 끄기" : "알림 켜기"}
          </Button>
        )}
        <p role="status" className="text-caption text-destructive empty:hidden">
          {error}
        </p>
        {canToggle && <p className="text-caption text-muted-foreground">이 기기에만 적용되고, 로그아웃하면 꺼져요.</p>}
      </CardContent>
    </Card>
  );
}
