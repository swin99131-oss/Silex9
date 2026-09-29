"use client";

import { FileText, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Megaphone,
  ShieldOff,
  SlidersHorizontal,
  Store,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { PageLoading } from "@/components/ui/Skeleton";

type IconType = LucideIcon;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="px-2 text-[11px] font-medium text-muted">{title}</p>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">{children}</div>
    </div>
  );
}

function Row({ href, icon: Icon, label, hint }: { href: string; icon: IconType; label: string; hint?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-chip">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chip">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-[11px] text-muted">{hint}</span>}
      </span>
      <ChevronLeft size={16} className="shrink-0 text-ink/40" />
    </Link>
  );
}

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function AppSettingsPage() {
  const router = useRouter();
  const { profile, loading } = useProfile();

  if (loading) return <PageLoading />;

  const isMerchant = profile?.role === "merchant";

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("تعذّر تسجيل الخروج، حاول مجدداً");
      return;
    }
    router.replace("/onboarding");
  }

  return (
    <div className="space-y-6 px-1 pb-10">
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="رجوع"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-chip"
        >
          <ArrowRight size={18} />
        </button>
        <h1 className="font-display text-[18px]">الإعدادات</h1>
      </div>

      <Section title="الحساب">
        <Row href="/profile/settings" icon={User} label="تعديل الملف الشخصي" hint="الاسم والصورة والنبذة والروابط" />
      </Section>

      {isMerchant ? (
        <Section title="حساب التاجر">
          <Row href="/dashboard" icon={LayoutDashboard} label="لوحة التاجر" />
          <Row href="/dashboard/ads" icon={Megaphone} label="الإعلانات" hint="روّج لمنتجاتك ومتجرك" />
          <Row href="/profile/merchant-setup" icon={Store} label="إعدادات المتجر" />
          <Row href="/dashboard/settings" icon={SlidersHorizontal} label="إعدادات اللوحة" />
        </Section>
      ) : (
        <Section title="حساب التاجر">
          <Row href="/profile/merchant-setup" icon={Store} label="التبديل إلى حساب تاجر" hint="اعرض منتجاتك وافتح متجرك" />
        </Section>
      )}

      <Section title="الخصوصية">
        <Row href="/profile/blocked" icon={ShieldOff} label="المستخدمون المحظورون" />
      </Section>

      <Section title="المساعدة والقانوني">
        <Row href="/privacy" icon={ShieldCheck} label="سياسة الخصوصية" />
        <Row href="/terms" icon={FileText} label="شروط الاستخدام" />
        {SUPPORT_EMAIL && <Row href={`mailto:${SUPPORT_EMAIL}`} icon={Mail} label="تواصل مع الدعم" />}
      </Section>

      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-pill border border-red-200 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        <LogOut size={16} />
        تسجيل الخروج
      </button>
    </div>
  );
}
