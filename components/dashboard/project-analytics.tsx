"use client"

import { Card } from "@/components/ui/card"
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
    <Card
      className="p-6 rounded-2xl border-0 shadow-sm bg-white transition-all duration-500 hover:shadow-md animate-slide-in-up"
      style={{ animationDelay: "400ms" }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">مبيعات الأسبوع</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>{formatIQD(weekTotal)}</span>
        </div>
      </div>

      {weekTotal === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
          لا توجد مبيعات مسجّلة هذا الأسبوع بعد.
        </div>
      ) : (
        <div className="h-64 flex items-end justify-between gap-2 px-2">
          {weekData.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${d.isToday ? "bg-primary" : "bg-primary/25"}`}
                style={{ height: `${Math.max(4, (d.total / maxTotal) * 200)}px` }}
              />
              <span className="text-[10px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
