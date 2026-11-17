import "server-only";

import { createClient } from "@supabase/supabase-js";
import webpush, { WebPushError } from "web-push";

import type { Database } from "@/shared/api/supabase/database.types";
import { getSupabaseEnv } from "@/shared/api/supabase/env";

import type { PushPayload } from "../model/payload";

// 하루 안에 기기가 켜지지 않으면 알림을 버린다. 오래된 "새 기록" 알림은 의미가 없다.
const TTL_SECONDS = 60 * 60 * 24;

type PushConfig = { secretKey: string; vapid: { publicKey: string; privateKey: string; subject: string } };

const getPushConfig = (): PushConfig | null => {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!publicKey || !privateKey || !subject || !secretKey) return null;
  return { secretKey, vapid: { privateKey, publicKey, subject } };
};

/**
 * 받는 사람의 구독은 RLS 때문에 보낸 사람 세션으로 읽을 수 없다. 이 파일에서만 service role(secret key)로 읽는다.
 * 이 클라이언트는 push_subscriptions 조회·만료 정리에만 쓰고, 받는 사람 계산에는 쓰지 않는다.
 */
const createAdminClient = (secretKey: string) =>
  createClient<Database>(getSupabaseEnv().url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

/**
 * 알림 실패는 사용자에게 보이지 않으므로 서버 로그(Vercel Functions 로그)에만 남긴다.
 * 구독 endpoint나 알림 내용은 남기지 않는다.
 */
export const logPushError = (message: string, error?: unknown) => {
  // biome-ignore lint/suspicious/noConsole: 응답 뒤에 도는 발송의 실패를 볼 곳이 서버 로그뿐이다.
  console.error(`[push] ${message}`, error instanceof Error ? error.message : (error ?? ""));
};

export type PushMessage = { userId: string; payload: PushPayload };

// 실패해도 던지지 않는다. 저장·댓글은 이미 끝났고, 알림은 덤이다.
export const sendPushMessages = async (messages: PushMessage[]) => {
  if (messages.length === 0) return;
  const config = getPushConfig();
  if (!config) {
    logPushError("VAPID 키나 SUPABASE_SECRET_KEY가 없어 알림을 보내지 않았습니다.");
    return;
  }

  const admin = createAdminClient(config.secretKey);
  const userIds = [...new Set(messages.map((message) => message.userId))];
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (error) {
    logPushError("구독을 읽지 못했습니다.", error.message);
    return;
  }

  const payloadByUser = new Map(messages.map((message) => [message.userId, JSON.stringify(message.payload)]));
  const expiredEndpoints: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      const payload = payloadByUser.get(subscription.user_id);
      if (!payload) return;
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { auth: subscription.auth, p256dh: subscription.p256dh } },
          payload,
          { TTL: TTL_SECONDS, vapidDetails: config.vapid },
        );
      } catch (sendError) {
        // 410·404는 브라우저가 구독을 끊었거나 사라진 것이라 다시 보낼 수 없다.
        if (sendError instanceof WebPushError && (sendError.statusCode === 404 || sendError.statusCode === 410)) {
          expiredEndpoints.push(subscription.endpoint);
          return;
        }
        logPushError("알림을 보내지 못했습니다.", sendError);
      }
    }),
  );

  if (expiredEndpoints.length > 0) {
    const { error: deleteError } = await admin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
    if (deleteError) logPushError("만료된 구독을 지우지 못했습니다.", deleteError.message);
  }
};
