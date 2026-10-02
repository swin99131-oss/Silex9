"use client";

import { Notice } from "@/components/ui/Notice";
import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // استرجاع البريد المحفوظ عند تحميل الصفحة
  useEffect(() => {
    const saved = localStorage.getItem("auth_email");
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  // تحديث البريد الإلكتروني كما يكتبه المستخدم تماماً دون تعديل أو بتر لحمايته من أخطاء التوافق
  function handleEmailChange(value: string) {
    setEmail(value.trim());
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErr("يرجى إدخال البريد وكلمة المرور");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      // إرسال البريد المكتوب وكلمة المرور مباشرة إلى نظام حماية Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password,
      });

      if (error) {
        setErr(
          error.message === "Invalid login credentials"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : error.message === "Email not confirmed"
            ? "لم يتم تفعيل بريدك بعد. تحقق من بريدك الإلكتروني واضغط على رابط التفعيل."
            : `حدث خطأ أثناء تسجيل الدخول: ${error.message} (${error.status ?? "-"})`
        );
      } else if (data?.session) {
        // إدارة خيار تذكر الحساب
        if (rememberMe) {
          localStorage.setItem("auth_email", email);
        } else {
          localStorage.removeItem("auth_email");
        }
        let dest = "/home";
        try {
          dest = sessionStorage.getItem("after_login") || "/home";
          sessionStorage.removeItem("after_login");
        } catch {}
        router.push(dest);
      }
    } catch (error) {
      setErr("حدث خطأ غير متوقع");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/home`,
      },
    });
  };

  return (
    <div className="app-shell flex flex-col justify-center p-6 dir-rtl">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1">
            مرحباً بك في ساليكس
          </h1>
          <p className="text-xs text-[#111111]/60">
            سجل دخولك لحفظ جلساتك ومتابعة طلباتك
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#111111]/70 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="flex items-center bg-[#faf8f5] border border-[#111111]/15 rounded-2xl px-4 py-3 focus-within:border-[#111111] transition-all">
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="example@domain.com"
                className="flex-1 bg-transparent outline-none text-sm text-[#111111] placeholder:text-[#111111]/40"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#111111]/70 mb-1.5">
              كلمة المرور
            </label>
            <div className="flex items-center bg-[#faf8f5] border border-[#111111]/15 rounded-2xl px-4 py-3 gap-3 focus-within:border-[#111111] transition-all">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 bg-transparent outline-none text-sm text-[#111111] placeholder:text-[#111111]/40"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#111111]/40 hover:text-[#111111] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#111111]/20 text-[#111111] focus:ring-[#111111]/10"
              />
              <span className="text-xs text-[#111111]/70">تذكر البريد</span>
            </label>
          </div>

          {err && (
            <Notice type="error">{err}</Notice>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#111111] hover:bg-[#111111]/90 disabled:opacity-50 text-[#faf8f5] text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            {busy ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#111111]/10"></div>
          </div>
          <span className="relative bg-[#faf8f5] px-3 text-xs text-[#111111]/50">أو عبر</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full py-3 px-4 rounded-2xl border border-[#111111]/15 bg-[#faf8f5] hover:bg-[#111111]/5 text-[#111111] text-sm font-medium flex items-center justify-center gap-2 transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          متابعة باستخدام Google
        </button>

        <div className="mt-6 text-center text-xs text-[#111111]/60">
          ليس لديك حساب؟{" "}
          <Link href="/register" className="text-[#111111] font-bold underline underline-offset-4 hover:opacity-80 transition">
            إنشاء حساب جديد
          </Link>
        </div>
      </div>
    </div>
  );
}