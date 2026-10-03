"use client";

import { WhatsappInput } from "@/components/ui/WhatsappInput";
import { Notice } from "@/components/ui/Notice";
import { PageLoading } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Camera,
  User,
  AtSign,
  Mail,
  ShieldAlert,
  ChevronLeft,
  LogOut,
  Phone,
  Store,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { SocialLinksEditor } from "@/components/SocialLinks";

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, setProfile, loading } = useProfile();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [blockedCount, setBlockedCount] = useState<number | null>(null);
  const [merchantBusy, setMerchantBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setAvatarUrl(profile.avatar_url);
    setFullName(profile.full_name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setWhatsapp(profile.whatsapp ?? "");
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("blocks")
      .select("*", { count: "exact", head: true })
      .eq("blocker_id", user.id)
      .then(({ count }) => setBlockedCount(count ?? 0));
  }, [user]);

  if (loading) {
    return <PageLoading />;
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setMsg(null);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      setAvatarUrl(publicUrl);
      setMsg({ type: "ok", text: "تم تحديث الصورة الشخصية" });
    } catch (err) {
      setMsg({ type: "err", text: "تعذّر رفع الصورة، حاول مجدداً" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          username: username.trim() || null,
          bio: bio.trim() || null,
          whatsapp: whatsapp.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      setMsg({ type: "ok", text: "تم حفظ التغييرات بنجاح" });
    } catch (err: any) {
      console.error("Save error:", err);
      setMsg({ type: "err", text: `تعذّر الحفظ: ${err?.message || "خطأ غير معروف"}` });
    } finally {
      setSaving(false);
    }
  }

  async function handleStopMerchant() {
    if (!user) return;
    if (!confirm("سيتم إيقاف الوضع التجاري وإخفاء زر النشر والمنشورات عن حسابك. يمكنك تفعيله مجدداً في أي وقت. هل تريد المتابعة؟")) return;
    setMerchantBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: "customer", assistant_enabled: false })
        .eq("id", user.id);
      if (error) throw error;
      await supabase.from("products").update({ is_active: false }).eq("merchant_id", user.id);
      setProfile((p) => (p ? { ...p, role: "customer" } : p));
      setMsg({ type: "ok", text: "تم إيقاف الحساب التجاري وإخفاء منتجاتك" });
    } catch (err: any) {
      setMsg({ type: "err", text: "تعذّر إيقاف الحساب التجاري، حاول مجدداً" });
    } finally {
      setMerchantBusy(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("تعذّر تسجيل الخروج، حاول مجدداً");
      return;
    }
    toast.success("تم تسجيل الخروج بنجاح");
    router.replace("/onboarding");
  }

  const isMerchant = profile?.role === "merchant";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 dir-rtl">
      <div className="flex items-center gap-3 border-b border-line/30 pb-4">
        <Link
          href="/profile"
          className="p-2 rounded-full hover:bg-chip text-ink transition-colors"
        >
          <ArrowRight size={20} />
        </Link>
        <h1 className="text-lg font-bold text-ink">إعدادات الحساب وتعديل الملف</h1>
      </div>

      {msg && <Notice type={msg.type === "ok" ? "success" : "error"}>{msg.text}</Notice>}

      <div className="bg-card border border-line/40 rounded-2xl p-6 flex flex-col items-center justify-center space-y-3">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-chip border-2 border-line/30 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-ink/40" />
            )}
          </div>
          <label
            htmlFor="settings-avatar"
            className="absolute bottom-0 right-0 bg-white text-ink p-2 rounded-full cursor-pointer hover:scale-105 transition-transform shadow-md border border-line"
          >
            <Camera size={14} strokeWidth={1.75} />
            <input
              type="file"
              id="settings-avatar"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
              disabled={uploading}
            />
          </label>
        </div>
        <span className="text-xs text-muted">
          {uploading ? "جارٍ رفع الصورة..." : "اضغط على الكاميرا لتغيير الصورة الشخصية"}
        </span>
      </div>

      <div className="bg-card border border-line/40 rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
          البيانات الأساسية
        </h2>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">الاسم الكامل</label>
          <div className="relative">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-chip border border-line/40 text-ink text-xs focus:outline-none focus:border-ink"
            />
            <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">اسم المستخدم (@username)</label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-chip border border-line/40 text-ink text-xs focus:outline-none focus:border-ink"
            />
            <AtSign size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">النبذة التعريفية (Bio)</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-xl bg-chip border border-line/40 text-ink text-xs focus:outline-none focus:border-ink resize-none"
          />
        </div>
      </div>

      <div className="bg-card border border-line/40 rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
          الأمان والتواصل
        </h2>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">البريد الإلكتروني</label>
          <div className="relative">
            <input
              type="email"
              value={user.email ?? ""}
              disabled
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-chip/60 border border-line/40 text-ink/50 text-xs cursor-not-allowed"
            />
            <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <p className="text-[10px] text-muted mt-1">لا يمكن تغيير البريد الإلكتروني حالياً</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">رقم الواتساب</label>
          <WhatsappInput value={whatsapp} onChange={setWhatsapp} />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-xl bg-ink text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
      >
        {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
      </button>

      <div className="bg-card border border-line/40 rounded-2xl p-6">
        {user && <SocialLinksEditor userId={user.id} />}
      </div>

      {/* الخصوصية: الحسابات المحظورة */}
      <div className="bg-card border border-line/40 rounded-2xl p-6 space-y-1">
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
          الخصوصية
        </h2>
        <Link
          href="/profile/blocked"
          className="flex items-center justify-between py-2 group"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={16} className="text-ink/60" />
            <span className="text-sm text-ink">الحسابات المحظورة</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted">
            <span className="text-xs">{blockedCount ?? "..."}</span>
            <ChevronLeft size={16} />
          </div>
        </Link>
      </div>

      {/* الحساب التجاري */}
      <div className="bg-card border border-line/40 rounded-2xl p-6 space-y-3">
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
          الحساب التجاري
        </h2>

        {isMerchant ? (
          <>
            <Link
              href="/dashboard"
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-2.5">
                <Store size={16} className="text-ink/60" />
                <span className="text-sm text-ink">لوحة التاجر</span>
              </div>
              <ChevronLeft size={16} className="text-muted" />
            </Link>
            <button
              onClick={handleStopMerchant}
              disabled={merchantBusy}
              className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50/40 transition-colors disabled:opacity-50"
            >
              {merchantBusy ? "جارٍ الإيقاف..." : "إيقاف الوضع التجاري"}
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted leading-relaxed">
              فعّل الحساب التجاري لتتمكن من عرض منتجاتك وفتح متجرك الخاص ولوحة تحكم مخصصة للتجار.
            </p>
            <button
              onClick={() => router.push("/profile/merchant-setup")}
              disabled={merchantBusy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-ink text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Store size={15} />
              تفعيل حساب تجاري
            </button>
          </>
        )}
      </div>

      <div className="pt-4 space-y-2">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-line/40 text-rose-600 text-xs font-semibold hover:bg-rose-50/40 transition-colors"
        >
          <LogOut size={16} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}
