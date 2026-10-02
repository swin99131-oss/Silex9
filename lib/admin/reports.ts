import { supabase } from "@/lib/supabase";

export type ReportStatus = "open" | "resolved" | "dismissed";

export type AdminReport = {
  id: string;
  reason: string | null;
  details: string | null;
  target_type: string | null;
  target_id: string | null;
  status: string;
  created_at: string;
  reporter: { id: string; name: string } | null;
  reported: { id: string; name: string } | null;
};

type ProfileRow = { id: string; full_name: string | null; username: string | null; store_name: string | null };

const nameOf = (p: ProfileRow) => p.store_name || p.full_name || p.username || "مستخدم";

export async function getReports(status: ReportStatus): Promise<AdminReport[]> {
  let q = supabase
    .from("reports")
    .select("id, reporter_id, reported_id, reason, details, target_type, target_id, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  q = status === "open" ? q.not("status", "in", "(resolved,dismissed)") : q.eq("status", status);

  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];

  const ids = Array.from(new Set(rows.flatMap((r) => [r.reporter_id, r.reported_id]).filter(Boolean))) as string[];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await supabase.from("profiles").select("id, full_name, username, store_name").in("id", ids);
    (ps as ProfileRow[] | null)?.forEach((p) => names.set(p.id, nameOf(p)));
  }
  const who = (id: string | null) => (id ? { id, name: names.get(id) ?? "مستخدم" } : null);

  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    details: r.details,
    target_type: r.target_type,
    target_id: r.target_id,
    status: r.status,
    created_at: r.created_at,
    reporter: who(r.reporter_id),
    reported: who(r.reported_id),
  }));
}

export async function setReportStatus(id: string, status: ReportStatus) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("reports")
    .update({ status, reviewed_by: u.user?.id ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
