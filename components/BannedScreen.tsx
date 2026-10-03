"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export function BannedScreen({ reason }: { reason: string | null }) {
  const router = useRouter();

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("تعذّر تسجيل الخروج، حاول مجدداً");
      return;
    }
    toast.success("تم تسجيل الخروج بنجاح");
    router.replace("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-8 text-center text-ink">
      <ShieldAlert size={44} className="text-red-600" />
      <h1 className="font-display text-xl">تم إيقاف حسابك</h1>
      {reason && <p className="text-sm text-muted">السبب: {reason}</p>}
      <p className="text-sm text-muted">إذا كنت تعتقد أن هذا حدث بالخطأ تواصل مع الدعم.</p>
      {SUPPORT_EMAIL && (
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm underline">
          {SUPPORT_EMAIL}
        </a>
      )}
      <button type="button" onClick={logout} className="mt-2 rounded-pill border border-line px-6 py-2.5 text-sm font-semibold">
        تسجيل الخروج
      </button>
    </div>
  );
}
