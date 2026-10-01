import { supabase } from "@/lib/supabase";

export type ReportTarget = "post" | "comment" | "story" | "product" | "user";

// الجدول والعمود اللذان يحددان صاحب العنصر المبلّغ عنه
const OWNER: Record<Exclude<ReportTarget, "user">, { table: string; col: string }> = {
  post: { table: "posts", col: "user_id" },
  comment: { table: "post_comments", col: "user_id" },
  story: { table: "stories", col: "merchant_id" },
  product: { table: "products", col: "merchant_id" },
};

export async function submitReport(type: ReportTarget, targetId: string, reason: string): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  const me = data.user?.id;
  if (!me) return false;

  let reportedId: string | null = null;
  if (type === "user") {
    reportedId = targetId;
  } else {
    const { table, col } = OWNER[type];
    const { data: row } = await supabase.from(table).select(col).eq("id", targetId).maybeSingle();
    reportedId = (row as Record<string, string> | null)?.[col] ?? null;
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: me,
    reported_id: reportedId,
    reason: reason.trim().slice(0, 300),
    target_type: type,
    target_id: targetId,
  });
  return !error;
}
