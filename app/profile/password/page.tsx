"use client";

import { useEffect, useState } from "react";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Notice } from "@/components/ui/Notice";
import { PageLoading } from "@/components/ui/Skeleton";

const field =
  "w-full rounded-2xl bg-chip px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-ink/20";

export default function PasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHasPassword(!!data.user?.identities?.some((i) => i.provider === "email"));
      setChecking(false);
    });
  }, []);

  // إصلاح تجميد الخانة عند الرجوع عبر ذاكرة المتصفح (bfcache)
  useEffect(() => {
    function reset(event: PageTransitionEvent) {
      if (event.persisted) {
        setPw("");
        setPw2("");
        setErr("");
      }
    }
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function save() {
    setErr("");
    if (pw.length < 8) return setErr("كلمة المرور يجب ألا تقل عن 8 أحرف");
    if (pw !== pw2) return setErr("كلمتا المرور غير متطابقتين");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setErr(
        error.message.toLowerCase().includes("different")
          ? "اختر كلمة مرور مختلفة عن الحالية"
          : "تعذّر تغيير كلمة المرور، حاول مجدداً"
      );
      return;
    }
    toast.success("تم تغيير كلمة المرور");
    setPw("");
    setPw2("");
    router.back();
  }

  if (checking) return <PageLoading />;

  return (
    <div className="space-y-5 px-1 pb-10">
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="رجوع"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-chip"
        >
          <ArrowRight size={18} />
        </button>
        <h1 className="font-display text-[18px]">تغيير كلمة المرور</h1>
      </div>

      {!hasPassword ? (
        <Notice type="info">حسابك مسجّل عبر Google، ولا توجد كلمة مرور لتغييرها.</Notice>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 px-1 text-[11px] text-muted">كلمة المرور الجديدة</p>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                dir="ltr"
                className={`${field} pl-11`}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "إخفاء" : "إظهار"}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/50"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <p className="mb-1.5 px-1 text-[11px] text-muted">تأكيد كلمة المرور</p>
            <input
              type={show ? "text" : "password"}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
              dir="ltr"
              className={field}
            />
          </div>
          {err && <Notice type="error">{err}</Notice>}
          <button
            type="button"
            onClick={save}
            disabled={busy || !pw || !pw2}
            className="w-full rounded-pill bg-ink py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
          </button>
        </div>
      )}
    </div>
  );
}
