"use client";

import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <div className="app-shell flex flex-col justify-center items-center p-6 dir-rtl text-center">
      <div className="w-16 h-16 rounded-full bg-[#faf8f5] border border-[#111111]/15 flex items-center justify-center mb-5">
        <MailCheck size={28} className="text-[#111111]" />
      </div>
      <h1 className="text-xl font-bold text-[#111111] mb-2">تحقق من بريدك الإلكتروني</h1>
      <p className="text-sm text-[#111111]/60 max-w-xs leading-relaxed mb-8">
        أرسلنا رابط تفعيل إلى بريدك. افتح بريدك واضغط على الرابط لتفعيل حسابك والدخول مباشرة.
      </p>
      <Link href="/login" className="text-sm font-bold text-[#111111] underline underline-offset-4">
        العودة لتسجيل الدخول
      </Link>
    </div>
  );
}
