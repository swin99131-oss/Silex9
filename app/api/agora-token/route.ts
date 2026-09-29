import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { RtcRole, RtcTokenBuilder } from "agora-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const certificate = process.env.AGORA_APP_CERTIFICATE;
  if (!appId || !certificate) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { sessionId?: string } | null;
  const sessionId = body?.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData } = await sb.auth.getUser(auth.slice(7));
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: session } = await sb
    .from("call_sessions")
    .select("id, caller_id, callee_id, channel_name, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (["ended", "missed", "declined"].includes(session.status)) {
    return NextResponse.json({ error: "call_over" }, { status: 410 });
  }

  const uid = session.caller_id === user.id ? 1 : session.callee_id === user.id ? 2 : 0;
  if (!uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    certificate,
    session.channel_name,
    uid,
    RtcRole.PUBLISHER,
    3600,
    3600
  );
  return NextResponse.json({ token, uid, channel: session.channel_name, appId });
}
