"use client";

import { useState } from "react";
import { Flag, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const REASONS = ["محتوى مسيء", "احتيال أو نصب", "منتج محظور", "محتوى مزعج (سبام)", "انتهاك حقوق", "سبب آخر"];

export function ReportPostButton({ postId, reportedId }: { postId: string; reportedId: string }) {
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) {
      setBusy(false);
      toast.error("سجّل الدخول أولاً");
      return;
    }
    const { error } = await supabase.from("reports").insert({
      reporter_id: uid,
      reported_id: reportedId,
      post_id: postId,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? "سبق أن أبلغت عن هذا المنشور" : "تعذّر إرسال البلاغ، حاول مجدداً");
      if (error.code === "23505") setOpen(false);
      return;
    }
    setOpen(false);
    setDetails("");
    setReason(REASONS[0]);
    toast.success("تم إرسال البلاغ، شكراً لك");
  }

  return (
    <>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-label="المزيد"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink/60 hover:bg-chip"
        >
          <MoreHorizontal size={18} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setMenu(false)} />
            <div className="absolute left-0 top-9 z-[70] w-44 overflow-hidden rounded-2xl border border-line/30 bg-card shadow-float">
              <button
                type="button"
                onClick={() => {
                  setMenu(false);
                  setOpen(true);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-chip"
              >
                <Flag size={16} />
                إبلاغ عن المنشور
              </button>
            </div>
          </>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-card p-5 text-ink shadow-float">
            <h3 className="font-display text-lg">إبلاغ عن المنشور</h3>
            <div className="flex flex-col gap-2">
              {REASONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-chip px-3 py-2.5 text-sm">
                  <input type="radio" name={`report-${postId}`} checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </div>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 300))}
              placeholder="تفاصيل إضافية (اختياري)"
              className="w-full resize-none rounded-2xl bg-chip px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-ink/20"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="flex-1 rounded-pill bg-ink py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "جارٍ الإرسال..." : "إرسال البلاغ"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-pill border border-line px-5 py-2.5 text-sm font-semibold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
