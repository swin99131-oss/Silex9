"use client"

import { Card } from "@/components/ui/card"
import { useStore, formatIQD, toArabicNumber } from "@/components/store/store-context"

export function TopProducts() {
  const { topProducts } = useStore()

  return (
    <Card className="p-6 rounded-2xl border-0 shadow-sm bg-white transition-all duration-500 hover:shadow-md">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-sm">★</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">المنتجات الأكثر مبيعاً</h2>
        </div>
        <span className="text-xs text-muted-foreground">إجمالي المبيعات</span>
      </div>
      {topProducts.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">لا توجد مبيعات مسجّلة بعد.</div>
      ) : (
        <div className="space-y-2">
          {topProducts.map((p, i) => (
            <div key={p.name} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/40">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {toArabicNumber(i + 1)}
                </span>
                <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">{toArabicNumber(p.quantity)} وحدة</span>
                <span className="text-sm font-semibold text-emerald-700">{formatIQD(p.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
