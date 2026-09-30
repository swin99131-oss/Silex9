"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Mail, MessageCircle } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { supabase } from "@/lib/supabase"

export default function HelpPage() {
  const [report, setReport] = useState("")
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "")
  const [whatsapp, setWhatsapp] = useState("")

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["support_email", "support_whatsapp"])
      .then(({ data }) => {
        for (const r of (data ?? []) as { key: string; value: string }[]) {
          const v = (r.value ?? "").trim()
          if (!v) continue
          if (r.key === "support_email") setEmail(v)
          if (r.key === "support_whatsapp") setWhatsapp(v)
        }
      })
  }, [])

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = report.trim()
    if (!message) {
      toast.error("اكتب تفاصيل المشكلة أولاً")
      return
    }
    if (!email) {
      toast.error("لم يتم إعداد بريد التواصل مع الإدارة بعد")
      return
    }
    window.location.href = `mailto:${email}?subject=${encodeURIComponent("بلاغ عن مشكلة")}&body=${encodeURIComponent(message)}`
  }

  const waDigits = whatsapp.replace(/\D/g, "")

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Header title="المساعدة" description="معلومات المنصة وطريقة التواصل مع الإدارة والإبلاغ عن أي مشكلة." search={false} />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">معلومات المنصة</h2>
          <p className="text-sm text-muted">هذه اللوحة مخصصة لإدارة المتجر والمخزون والديون.</p>
          <p className="text-sm text-muted">لأي استفسار إداري أو طلب مساعدة، استخدم نموذج الإبلاغ أو وسائل التواصل أدناه.</p>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">تواصل مع الإدارة</h2>
          {!email && !waDigits ? (
            <p className="text-sm text-muted">لم تُضف الإدارة وسائل تواصل بعد.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {waDigits && (
                <a
                  href={`https://wa.me/${waDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center gap-3 rounded-full border border-border px-5 text-sm font-medium hover:bg-chip"
                >
                  <MessageCircle aria-hidden="true" className="size-4" />
                  واتساب
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex h-11 items-center gap-3 rounded-full border border-border px-5 text-sm font-medium hover:bg-chip"
                >
                  <Mail aria-hidden="true" className="size-4" />
                  <span dir="ltr">{email}</span>
                </a>
              )}
            </div>
          )}
          <Link href="/dashboard" className="inline-flex text-sm font-medium underline">
            الانتقال إلى لوحة التحكم
          </Link>
        </section>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">الإبلاغ عن مشكلة</h2>
          <p className="mt-1 text-sm text-muted">اكتب وصفًا واضحًا للمشكلة، وسيُفتح بريد موجه إلى الإدارة.</p>
        </div>
        <form onSubmit={submitReport} className="space-y-3">
          <textarea
            value={report}
            onChange={(event) => setReport(event.target.value)}
            placeholder="اشرح المشكلة وما الذي حدث..."
            className="min-h-32 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-foreground/40"
          />
          <button type="submit" className="h-11 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            إرسال البلاغ إلى الإدارة
          </button>
        </form>
      </section>
    </div>
  )
}
