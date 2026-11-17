"use server";

import { requireUser } from "@/shared/api/supabase/require-user";

import { isPushEndpoint, type PushSubscriptionResult, parsePushSubscription } from "../model/subscription";

// 이 브라우저의 구독을 내 것으로 저장한다. 다른 계정이 쓰던 브라우저면 주인이 나로 바뀐다(save_push_subscription).
export const savePushSubscription = async (value: unknown): Promise<PushSubscriptionResult> => {
  const { supabase } = await requireUser();
  const subscription = parsePushSubscription(value);
  if (!subscription) return { ok: false };

  const { error } = await supabase.rpc("save_push_subscription", {
    p_auth: subscription.keys.auth,
    p_endpoint: subscription.endpoint,
    p_p256dh: subscription.keys.p256dh,
  });
  return error ? { ok: false } : { ok: true };
};

// 내 구독만 지운다(RLS). 없는 구독이면 이미 꺼진 것이라 성공으로 본다.
export const deletePushSubscription = async (endpoint: unknown): Promise<PushSubscriptionResult> => {
  const { supabase } = await requireUser();
  if (!isPushEndpoint(endpoint)) return { ok: false };

  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return error ? { ok: false } : { ok: true };
};

// 브라우저에 구독이 남아 있어도 다른 계정의 것이면 "꺼짐"으로 보여야 한다.
export const isMyPushSubscription = async (endpoint: unknown): Promise<boolean> => {
  const { supabase } = await requireUser();
  if (!isPushEndpoint(endpoint)) return false;

  const { data, error } = await supabase.from("push_subscriptions").select("id").eq("endpoint", endpoint).maybeSingle();
  return !error && data !== null;
};
