"use client"

import { useCallback, useEffect, useState } from "react"
import { BadgeCheck } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

type Status = {
  role: string
  verified: boolean
  days: number
  followers: number
  min_days: number
  min_followers: number
  eligible: boolean
  request_status: string | null
  review_note: string | null
}

function Progress({ label, value, goal }: { label: string; value: number; goal: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(goal, 1)) * 100))
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium">
          {value.toLocaleString("ar")} / {goal.toLocaleString("ar")}
        </span>
      </div>
      <span className="block h-1.5 overflow-hidden rounded-full bg-chip">
        <span
          className={`block h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  )
}

export function VerificationCard() {
  const [st, setSt] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("my_verification_status")
    if (error) {
      setFailed(true)
      return
    }
    setSt(data as Status)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function request() {
    setBusy(true)
    const { error } = await supabase.rpc("request_my_verification")
    setBusy(false)
    if (error) {
      toast.error(error.code === "23505" ? "طلبك قيد المراجعة بالفعل" : "تعذّر إرسال الطلب، تأكد من استيفاء الشروط")
      void load()
      return
    }
    toast.success("تم إرسال طلب التوثيق")
    void load()
  }

  if (failed || !st || st.role !== "merchant") return null

  const pending = st.request_status === "pending"

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-sky-100 text-sky-600">
          <BadgeCheck aria-hidden="true" className="size-4" />
        </span>
        <h3 className="text-lg font-semibold">توثيق المتجر</h3>
      </div>

      {st.verified ? (
        <p className="mt-4 text-sm text-muted">حسابك موثّق، وتظهر الشارة بجانب اسم متجرك لكل الزبائن.</p>
      ) : pending ? (
        <p className="mt-4 text-sm text-muted">طلبك قيد المراجعة، سيصلك إشعار عند القرار.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {st.request_status === "rejected" && st.review_note && (
            <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">سبب الرفض السابق: {st.review_note}</p>
          )}
          <p className="text-sm text-muted">
            التوثيق يعطي متجرك شارة موثّق. يُمنح مجاناً لفترة أولى لمن يستوفي الشروط التالية:
          </p>
          <Progress label="عمر الحساب (أيام)" value={st.days} goal={st.min_days} />
          <Progress label="عدد المتابعين" value={st.followers} goal={st.min_followers} />
          <Button onClick={request} disabled={!st.eligible || busy} className="h-11 rounded-full px-6">
            {busy ? "جارٍ الإرسال..." : st.eligible ? "طلب التوثيق" : "لم تستوفِ الشروط بعد"}
          </Button>
        </div>
      )}
    </section>
  )
}
