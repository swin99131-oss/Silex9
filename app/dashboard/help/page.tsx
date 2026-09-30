"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Header } from "@/components/dashboard/header"

export default function HelpPage() {
  const [report, setReport] = useState("")
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = report.trim()
    if (!message) {
      toast.error("اكتب تفاصيل المشكلة أولاً")
      return
    }
    if (!supportEmail) {
      toast.error("لم يتم إعداد بريد التواصل مع الإدارة بعد")
      return
    }
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent("بلاغ عن مشكلة")}&body=${encodeURIComponent(message)}`
  }

  return (
    <>
<Header title="المساعدة" description="معلومات المنصة وطريقة الإبلاغ عن أي مشكلة." />
        <div className="mt-4 md:mt-5 max-w-5xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">الدعم والتواصل مع الإدارة</h1>
        <p className="text-sm text-muted-foreground mt-1">معلومات المنصة وطريقة الإبلاغ عن أي مشكلة.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="bg-card p-6 rounded-xl border space-y-3">
          <h2 className="font-semibold text-lg">معلومات المنصة</h2>
          <p className="text-sm text-muted-foreground">هذه اللوحة مخصصة لإدارة المتجر والمخزون والديون.</p>
          <p className="text-sm text-muted-foreground">لأي استفسار إداري أو طلب مساعدة، استخدم نموذج الإبلاغ وسيتم توجيهه إلى الإدارة.</p>
        </section>

        <section className="bg-card p-6 rounded-xl border space-y-3">
          <h2 className="font-semibold text-lg">لوحة التحكم</h2>
          <p className="text-sm text-muted-foreground">تابع مبيعاتك وديونك ومخزونك من مكان واحد.</p>
          <Link href="/dashboard" className="inline-flex text-sm font-medium text-primary hover:underline">
            الانتقال إلى لوحة التحكم
          </Link>
        </section>
      </div>

      <section className="bg-card p-6 rounded-xl border space-y-4">
        <div>
          <h2 className="font-semibold text-lg">الإبلاغ عن مشكلة</h2>
          <p className="text-sm text-muted-foreground mt-1">اكتب وصفًا واضحًا للمشكلة، وسيُفتح بريد موجه إلى الإدارة عند إعداد بريد الدعم.</p>
        </div>
        <form onSubmit={submitReport} className="space-y-3">
          <textarea
            value={report}
            onChange={(event) => setReport(event.target.value)}
            placeholder="اشرح المشكلة وما الذي حدث..."
            className="min-h-32 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            إرسال البلاغ إلى الإدارة
          </button>
        </form>
      </section>
        </div>
</>
  )
}
