"use client";

import { Dropdown } from "@/components/ui/Dropdown";
import { Notice } from "@/components/ui/Notice";
import { PageLoading } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { getCategories, type Category } from "@/lib/catalog";

export default function MerchantSetupPage() {
  const router = useRouter();
  const { user, profile, loading } = useProfile();

  const [storeName, setStoreName] = useState("");
  const [category, setCategory] = useState("");
  const [storeBio, setStoreBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!profile) return;
    setStoreName(profile.store_name ?? "");
    setCategory(profile.store_category ?? "");
    setStoreBio(profile.store_bio ?? "");
    setWhatsapp(profile.whatsapp ?? "");
  }, [profile]);

  if (loading) return <PageLoading />;
  if (!user) {
    router.replace("/login");
    return null;
  }

  const isMerchant = profile?.role === "merchant";

  async function submit() {
    if (!user) return;
    if (!storeName.trim()) return setErr("اسم المتجر مطلوب");
    if (!whatsapp.trim()) return setErr("رقم الواتساب مطلوب ليتواصل الزبائن معك");
    setBusy(true);
    setErr("");
    const patch = {
      role: "merchant" as const,
      store_name: storeName.trim(),
      store_category: category || null,
      store_bio: storeBio.trim() || null,
      whatsapp: whatsapp.trim(),
    };
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) {
      setBusy(false);
      return setErr(`تعذّر الحفظ: ${error.message}`);
    }
    await supabase.from("products").update({ is_active: true }).eq("merchant_id", user.id);
    setBusy(false);
    router.push("/profile/studio");
  }

  const field =
    "w-full px-4 py-2.5 rounded-xl bg-chip border border-line/40 text-ink text-sm focus:outline-none focus:border-ink";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3 border-b border-line/30 pb-4">
        <Link href="/profile/settings" className="p-2 rounded-full hover:bg-chip">
          <ArrowRight size={20} />
        </Link>
        <h1 className="text-lg font-bold">{isMerchant ? "إعدادات المتجر" : "إعداد حساب التاجر"}</h1>
      </div>

      <div className="bg-card border border-line/40 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-muted">
          <Store size={16} />
          <p className="text-xs">هذه البيانات تظهر للزبائن في صفحة متجرك.</p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">اسم المتجر</label>
          <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className={field} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">تصنيف المتجر</label>
          <Dropdown options={categories.map((c) => ({ value: c.id, label: c.name }))} value={category} onChange={setCategory} placeholder="اختر التصنيف" className={field} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">رقم الواتساب للحجز</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="9647XXXXXXXX"
            dir="ltr"
            className={field}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">نبذة عن المتجر</label>
          <textarea
            value={storeBio}
            onChange={(e) => setStoreBio(e.target.value)}
            rows={3}
            className={`${field} resize-none`}
          />
        </div>

        {err && (
          <Notice type="error">{err}</Notice>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full py-3.5 rounded-xl bg-ink text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "جارٍ الحفظ..." : isMerchant ? "حفظ" : "تفعيل حساب التاجر"}
        </button>
      </div>
    </div>
  );
}
