"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function PasswordRow() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setShow(!!data.user?.identities?.some((i) => i.provider === "email"));
    });
  }, []);

  if (!show) return null;

  return (
    <Link href="/profile/password" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-chip">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chip">
        <KeyRound size={17} />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium">تغيير كلمة المرور</span>
      <ChevronLeft size={16} className="shrink-0 text-ink/40" />
    </Link>
  );
}
