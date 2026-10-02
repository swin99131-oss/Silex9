import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const USDT_TRC20 = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TXID_RE = /^[0-9a-fA-F]{64}$/;

type TronTransfer = { transaction_id: string; to: string; value: string; token_info?: { address?: string } };

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "config" }, { status: 500 });
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const campaignId = String(body?.campaignId ?? "");
  const txid = String(body?.txid ?? "").trim().toLowerCase();
  if (!campaignId || !TXID_RE.test(txid)) return NextResponse.json({ error: "bad_input" }, { status: 400 });

  const { data: c } = await admin
    .from("campaigns")
    .select("id, status, is_free, pay_amount_usdt, pay_started_at")
    .eq("id", campaignId)
    .eq("merchant_id", u.user.id)
    .maybeSingle();
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (c.status !== "pending_payment") return NextResponse.json({ status: c.status });
  if (c.is_free || c.pay_amount_usdt == null || !c.pay_started_at) {
    return NextResponse.json({ error: "not_payable" }, { status: 400 });
  }

  const { data: m } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", "usdt_trc20_address")
    .maybeSingle();
  const address: string | undefined = m?.value?.trim();
  if (!address) return NextResponse.json({ error: "config" }, { status: 500 });

  const qs = new URLSearchParams({
    only_to: "true",
    only_confirmed: "true",
    contract_address: USDT_TRC20,
    limit: "200",
    min_timestamp: String(new Date(c.pay_started_at).getTime()),
  });
  const headers: Record<string, string> = {};
  if (process.env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;

  const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?${qs}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "chain_unavailable" }, { status: 502 });
  const json = (await res.json()) as { data?: TronTransfer[] };

  const tx = json.data?.find((t) => t.transaction_id.toLowerCase() === txid);
  if (!tx || tx.to !== address || tx.token_info?.address !== USDT_TRC20) {
    return NextResponse.json({ status: "not_found_yet" });
  }

  const required = Math.round(Number(c.pay_amount_usdt) * 1e6);
  if (Number(tx.value) !== required) {
    return NextResponse.json({
      status: "amount_mismatch",
      required: Number(c.pay_amount_usdt),
      received: Number(tx.value) / 1e6,
    });
  }

  const now = new Date().toISOString();
  const { data: done, error } = await admin
    .from("campaigns")
    .update({
      status: "pending_review",
      pay_txid: txid,
      paid_at: now,
      payment_ref: txid.slice(0, 40).toUpperCase(),
      review_note: null,
      updated_at: now,
    })
    .eq("id", c.id)
    .eq("status", "pending_payment")
    .select("id");
  if (error) {
    return NextResponse.json({ error: error.code === "23505" ? "txid_used" : "db" }, { status: 409 });
  }
  return NextResponse.json({ status: done?.length ? "paid" : "pending_review" });
}
