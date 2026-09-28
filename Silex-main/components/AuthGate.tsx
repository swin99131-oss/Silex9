"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function AuthGate() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  // Load saved email on mount
  useEffect(() => {
    const saved = localStorage.getItem("auth_email");
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  // Auto-complete @gmail.com
  function handleEmailChange(value: string) {
    let cleaned = value.trim();
    if (cleaned.includes("@")) {
      const [local] = cleaned.split("@");
      setEmail(local);
    } else {
      setEmail(cleaned);
    }
  }

  const displayEmail = email.includes("@") ? email : email ? `${email}@gmail.com` : "";

  async function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErr("أدخل البريد وكلمة المرور");
      return;
    }

    const finalEmail = displayEmail;
    if (!finalEmail.includes("@")) {
      setErr("أدخل بريداً صحيحاً");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: finalEmail,
          password,
        });
        if (error) {
          setErr(
            error.message === "Invalid login credentials"
              ? "البريد أو كلمة المرور غير صحيح"
              : "حدث خطأ، حاول مرة أخرى"
          );
        } else {
          if (rememberMe) {
            localStorage.setItem("auth_email", email);
          } else {
            localStorage.removeItem("auth_email");
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: finalEmail,
          password,
        });
        if (error) {
          setErr(
            error.message.includes("already registered")
              ? "هذا البريد مسجل بالفعل"
              : "تعذّر التسجيل، حاول مرة أخرى"
          );
        } else {
          if (rememberMe) {
            localStorage.setItem("auth_email", email);
          } else {
            localStorage.removeItem("auth_email");
          }
          setEmail("");
          setPassword("");
          setErr("");
          setIsLogin(true);
        }
      }
    } catch (error) {
      setErr("حدث خطأ غير متوقع");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 md:p-8 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl text-slate-100 dir-rtl">
      {/* الترويسة والشعار الهادئ */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xl mb-3">
          S
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          {isLogin ? "مرحباً بك في ساليكس" : "إنشاء حساب جديد"}
        </h1>
        <p className="text-xs text-slate-400">
          {isLogin
            ? "سجل دخولك لحفظ جلساتك ومتابعة طلباتك"
            : "انضم إلى منصة ساليكس واستمتع بكافة الميزات"}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* البريد الإلكتروني */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5 font-medium">
            البريد الإلكتروني
          </label>
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 focus-within:border-emerald-500/50 transition">
            <input
              type="text"
              dir="ltr"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="example"
              className="flex-1 bg-transparent outline-none text-sm text-slate-100 placeholder-slate-600"
            />
            {!email.includes("@") && email && (
              <span className="text-xs text-slate-500 font-mono">@gmail.com</span>
            )}
          </div>
        </div>

        {/* كلمة المرور */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5 font-medium">
            كلمة المرور
          </label>
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 gap-3 focus-within:border-emerald-500/50 transition">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="flex-1 bg-transparent outline-none text-sm text-slate-100 placeholder-slate-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-500 hover:text-slate-300 transition"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* خيار تذكر البريد */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500/20"
            />
            <span className="text-xs text-slate-400">
              {isLogin ? "تذكر البريد" : "أوافق على الشروط والأحكام"}
            </span>
          </label>
        </div>

        {/* رسالة الخطأ */}
        {err && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-center">
            {err}
          </div>
        )}

        {/* زر الإرسال الرئيسي - الأخضر العالي التباين */}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-2xl py-3 text-sm transition shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
        >
          {busy ? (
            <span>{isLogin ? "جارٍ الدخول…" : "جارٍ التسجيل…"}</span>
          ) : (
            <span>{isLogin ? "تسجيل الدخول" : "إنشاء الحساب"}</span>
          )}
        </button>

        {/* التحويل بين الدخول والتسجيل */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErr("");
              setPassword("");
            }}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            {isLogin ? (
              <>
                ليس لديك حساب؟{" "}
                <span className="font-semibold text-emerald-400 underline underline-offset-4">
                  أنشئ حساباً جديداً
                </span>
              </>
            ) : (
              <>
                لديك حساب بالفعل؟{" "}
                <span className="font-semibold text-emerald-400 underline underline-offset-4">
                  سجل الدخول
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
