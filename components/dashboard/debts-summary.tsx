"use client"

import { Card } from "@/components/ui/card"
import { Wallet } from "lucide-react"
import { useStore, formatIQD, toArabicNumber } from "@/components/store/store-context"

export function DebtsSummary() {
  const { debtors } = useStore()
  const active = debtors.filter((d) => !d.paid)
  const overdue = active.filter((d) => d.overdue)
  const total = active.reduce((s, d) => s + d.amount, 0)

  return (
    <Card className="p-6 rounded-2xl border-0 shadow-sm bg-orange-50 transition-all duration-500 hover:shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-orange-700" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">ملخص الديون</h2>
      </div>
      {active.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">لا توجد ديون مسجّلة حالياً.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">إجمالي الديون النشطة</span>
            <span className="text-lg font-bold text-orange-800">{formatIQD(total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">عدد الزبائن المتأخرين</span>
            <span className="text-sm font-semibold text-red-700">{toArabicNumber(overdue.length)}</span>
          </div>
        </div>
      )}
    </Card>
  )
}
