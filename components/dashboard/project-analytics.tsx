"use client"

import { useMemo } from "react"
import { useStore, formatIQD } from "@/components/store/store-context"

export function ProjectAnalytics() {
  const { orders } = useStore()

  const weekData = useMemo(() => {
    const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    const now = new Date()
    const buckets = days.map((label, idx) => ({ label, total: 0, isToday: idx === now.getDay() }))
    for (const order of orders) {
      buckets[now.getDay()].total += order.total
    }
    return buckets
  }, [orders])

  const maxTotal = Math.max(...weekData.map((d) => d.total), 1)
  const weekTotal = weekData.reduce((s, d) => s + d.total, 0)

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">مبيعات الأسبوع</h2>
        <span className="text-sm text-muted">{formatIQD(weekTotal)}</span>
      </div>

      {weekTotal === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-muted">
          لا توجد مبيعات مسجّلة هذا الأسبوع بعد.
        </div>
      ) : (
        <div className="flex h-56 items-end justify-between gap-3">
          {weekData.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={`w-full rounded-t-lg ${d.isToday ? "bg-primary" : "bg-primary/25"}`}
                style={{ height: `${Math.max(4, (d.total / maxTotal) * 180)}px` }}
              />
              <span className="text-[11px] text-muted">{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
