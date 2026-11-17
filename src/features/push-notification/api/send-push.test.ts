import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SUBSCRIPTIONS = [
  { auth: "a1", endpoint: "https://push.test/ok", p256dh: "p1", user_id: "b" },
  { auth: "a2", endpoint: "https://push.test/gone", p256dh: "p2", user_id: "b" },
  { auth: "a3", endpoint: "https://push.test/missing", p256dh: "p3", user_id: "c" },
  { auth: "a4", endpoint: "https://push.test/flaky", p256dh: "p4", user_id: "c" },
];

const db = vi.hoisted(() => ({
  deleted: [] as string[],
  selectedUserIds: [] as string[],
}));

vi.mock("server-only", () => ({}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      delete: () => ({
        in: async (_column: string, endpoints: string[]) => {
          db.deleted.push(...endpoints);
          return { error: null };
        },
      }),
      select: () => ({
        in: async (_column: string, userIds: string[]) => {
          db.selectedUserIds = userIds;
          return { data: SUBSCRIPTIONS.filter((s) => userIds.includes(s.user_id)), error: null };
        },
      }),
    }),
  }),
}));

vi.mock("web-push", () => {
  class WebPushError extends Error {
    constructor(public statusCode: number) {
      super(`status ${statusCode}`);
    }
  }
  const STATUS: Record<string, number> = {
    "https://push.test/flaky": 500,
    "https://push.test/gone": 410,
    "https://push.test/missing": 404,
  };
  const sendNotification = vi.fn(async ({ endpoint }: { endpoint: string }) => {
    const status = STATUS[endpoint];
    if (status) throw new WebPushError(status);
    return { statusCode: 201 };
  });
  return { default: { sendNotification }, WebPushError };
});

const { sendPushMessages } = await import("./send-push");
const webpush = (await import("web-push")).default;

const PAYLOAD = { body: "본문", tag: "workout-w1", title: "제목", url: "/workouts/w1" };

beforeEach(() => {
  db.deleted = [];
  db.selectedUserIds = [];
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public");
  vi.stubEnv("VAPID_PRIVATE_KEY", "private");
  vi.stubEnv("VAPID_SUBJECT", "https://sweat-log.test");
  vi.stubEnv("SUPABASE_SECRET_KEY", "secret");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(webpush.sendNotification).mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendPushMessages", () => {
  it("받는 사람의 모든 구독에 보내고 410·404 구독만 지운다", async () => {
    await sendPushMessages([
      { payload: PAYLOAD, userId: "b" },
      { payload: PAYLOAD, userId: "c" },
    ]);

    expect(db.selectedUserIds).toEqual(["b", "c"]);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(4);
    expect(db.deleted.sort()).toEqual(["https://push.test/gone", "https://push.test/missing"]);
  });

  it("각 구독에 그 사람의 알림 내용을 암호화 키와 함께 보낸다", async () => {
    await sendPushMessages([{ payload: PAYLOAD, userId: "b" }]);

    expect(webpush.sendNotification).toHaveBeenCalledWith(
      { endpoint: "https://push.test/ok", keys: { auth: "a1", p256dh: "p1" } },
      JSON.stringify(PAYLOAD),
      expect.objectContaining({
        vapidDetails: { privateKey: "private", publicKey: "public", subject: "https://sweat-log.test" },
      }),
    );
  });

  it("키가 설정되지 않았으면 보내지 않고 던지지도 않는다", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");

    await expect(sendPushMessages([{ payload: PAYLOAD, userId: "b" }])).resolves.toBeUndefined();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("받는 사람이 없으면 DB도 읽지 않는다", async () => {
    await sendPushMessages([]);

    expect(db.selectedUserIds).toEqual([]);
  });
});
