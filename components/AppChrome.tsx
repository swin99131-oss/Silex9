"use client";

import { BannedScreen } from "@/components/BannedScreen";
import { CallProvider } from "@/components/CallProvider";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Home, Compass, User, MessageCircle, PlusSquare, Search, ShoppingBag, Settings } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useCart } from "@/lib/cart-context";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCart();

  const isAuthPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth") ||
    pathname === "/privacy" ||
    pathname === "/terms";

  const [ready, setReady] = useState(false);
  const [isMerchant, setIsMerchant] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [banned, setBanned] = useState<{ reason: string | null } | null>(null);

  useEffect(() => {
    if (isAuthPage) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user.id ?? null);
      if (!data.session) {
        try { sessionStorage.setItem("after_login", pathname); } catch {}
        router.replace("/onboarding");
      } else setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUserId(session?.user.id ?? null);
      if (!session) router.replace("/onboarding");
    });
    return () => sub.subscription.unsubscribe();
  }, [pathname, isAuthPage, router]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("auth") !== "login_success") return;
    toast.success("تم تسجيل الدخول بنجاح");
    url.searchParams.delete("auth");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [pathname]);

  useEffect(() => {
    if (isAuthPage) return;
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) return;
      const { data: p } = await supabase.from("profiles").select("role, banned_at, ban_reason").eq("id", uid).maybeSingle();
      if (alive) setIsMerchant(p?.role === "merchant");
      if (alive) setBanned(p?.banned_at ? { reason: p.ban_reason ?? null } : null);
    });
    return () => {
      alive = false;
    };
  }, [isAuthPage]);

  if (pathname.startsWith("/admin")) return <>{children}</>;

  if (isAuthPage) {
    return <main className="min-h-screen w-full bg-[#ECE9E2]">{children}</main>;
  }

  if (!ready) return <PageSkeleton />;

  if (banned) return <BannedScreen reason={banned.reason} />;

  const navItems = isMerchant
    ? [
        { label: "الرئيسية", href: "/home", icon: Home },
        { label: "استكشف", href: "/category", icon: Compass },
        { label: "نشر", href: "/profile/studio", icon: PlusSquare },
        { label: "الدردشة", href: "/chat", icon: MessageCircle },
        { label: "حسابي", href: "/profile", icon: User },
      ]
    : [
        { label: "الرئيسية", href: "/home", icon: Home },
        { label: "استكشف", href: "/category", icon: Compass },
        { label: "الدردشة", href: "/chat", icon: MessageCircle },
        { label: "حسابي", href: "/profile", icon: User },
      ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const badge =
    count > 0 ? (
      <span className="absolute -top-1 -left-1 bg-[#1e3a5f] text-white text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
        {count}
      </span>
    ) : null;

  return (
    <CallProvider>
    <div className="min-h-screen bg-paper text-[#1e3a5f]">
      {/* شريط جانبي - كمبيوتر */}
      <aside className="hidden md:flex fixed top-0 bottom-0 right-0 w-64 flex-col border-l-2 border-[#1e3a5f]/15 bg-paper p-4 z-40">
        <Link href="/home" className="px-3 py-4 mb-2">
          <Logo className="h-8 w-auto text-[#1e3a5f]" />
        </Link>
        <nav className="flex flex-col gap-1">
          {[...navItems, { label: "بحث", href: "/search", icon: Search }].map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
                  active ? "bg-[#1e3a5f]/10 font-bold" : "text-[#1e3a5f]/60 hover:bg-[#1e3a5f]/5 hover:text-[#1e3a5f]"
                }`}
              >
                <Icon size={20} className={active ? "stroke-[2.5px]" : "stroke-[1.75px]"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#1e3a5f]/15 pt-3">
          <Link
            href="/cart"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
              isActive("/cart") ? "bg-[#1e3a5f]/10 font-bold" : "text-[#1e3a5f]/70 hover:bg-[#1e3a5f]/5"
            }`}
          >
            <span className="relative">
              <ShoppingBag size={20} />
              {badge}
            </span>
            السلة
          </Link>
                    <NotificationBell
            userId={currentUserId}
            showLabel
            className={`transition-colors ${isActive("/notifications") ? "bg-[#1e3a5f]/10 font-bold" : "text-[#1e3a5f]/70 hover:bg-[#1e3a5f]/5"} flex items-center gap-3 rounded-xl px-3 py-3 text-sm`}
          />
          <Link
            href="/profile/app-settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
              isActive("/profile/app-settings") ? "bg-[#1e3a5f]/10 font-bold" : "text-[#1e3a5f]/70 hover:bg-[#1e3a5f]/5"
            }`}
          >
            <Settings size={20} />
            الإعدادات
          </Link>
        </div>
      </aside>

      {/* هيدر علوي - موبايل */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-paper border-b-2 border-[#1e3a5f]/15 px-4 py-3">
        <Link href="/home">
          <Logo className="h-7 w-auto text-[#1e3a5f]" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="بحث"
            className="w-10 h-10 rounded-full bg-[#1e3a5f]/5 flex items-center justify-center"
          >
            <Search size={18} />
          </Link>
          <NotificationBell
            userId={currentUserId}
            className="w-10 h-10 rounded-full bg-[#1e3a5f]/5 flex items-center justify-center"
          />
          <Link
            href="/cart"
            aria-label="السلة"
            className="relative w-10 h-10 rounded-full bg-[#1e3a5f]/5 flex items-center justify-center"
          >
            <ShoppingBag size={18} />
            {badge}
          </Link>
                  </div>
      </header>

      <main className="md:mr-64 max-w-5xl mx-auto w-full px-4 py-4 pb-24 md:pb-6">{children}</main>

      {/* شريط سفلي - موبايل */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-paper border-t-2 border-[#1e3a5f]/15 px-4 py-2">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 p-1.5 text-[10px] font-medium transition-colors ${
                  active ? "text-[#1e3a5f] font-bold" : "text-[#1e3a5f]/50 hover:text-[#1e3a5f]"
                }`}
              >
                <Icon size={20} className={active ? "stroke-[2.5px]" : "stroke-[1.75px]"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
    </CallProvider>
  );
}
