import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

type WebhookNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type?: string;
};

function secretMatches(received: string | null, expected: string) {
  if (!received) return false;
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.ONESIGNAL_WEBHOOK_SECRET;
  const appId = process.env.ONESIGNAL_APP_ID ?? process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !restApiKey) {
    return NextResponse.json({ error: "OneSignal is not configured" }, { status: 503 });
  }
  const authorization = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const receivedSecret = webhookSecret
    ? request.headers.get("x-onesignal-webhook-secret")
    : authorization;
  const expectedSecret = webhookSecret ?? restApiKey;
  if (!secretMatches(receivedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { type?: string; table?: string; record?: WebhookNotification };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const notification = payload.record;
  if (payload.table !== "notifications" || payload.type !== "INSERT" || !notification) {
    return NextResponse.json({ error: "Unsupported webhook event" }, { status: 400 });
  }
  if (
    typeof notification.id !== "string" ||
    typeof notification.user_id !== "string" ||
    typeof notification.title !== "string" ||
    typeof notification.body !== "string"
  ) {
    return NextResponse.json({ error: "Invalid notification record" }, { status: 400 });
  }

  const response = await fetch("https://api.onesignal.com/notifications?c=push", {
    method: "POST",
    headers: {
      Authorization: `Key ${restApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      include_aliases: { external_id: [notification.user_id] },
      target_channel: "push",
      headings: { en: notification.title, ar: notification.title },
      contents: { en: notification.body, ar: notification.body },
      data: { notification_id: notification.id, type: notification.type ?? "general" },
    }),
  });

  if (!response.ok) {
    console.error("OneSignal push request failed", response.status, await response.text());
    return NextResponse.json({ error: "OneSignal delivery failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
