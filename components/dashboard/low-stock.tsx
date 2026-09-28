"use client"

import { Card } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { useStore, toArabicNumber } from "@/components/store/store-context"

export function LowStock() {
  const { products } = useStore()
  const items = products.filter((product) => product.stock > 0 && product.stock <= 10).slice(0, 4)
  return (
    <Card className="p-6 transition-all duration-500 hover:shadow-xl animate-slide-in-up">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">قاربت على النفاد</h2>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">لا توجد منتجات قاربت النفاد.</p> : items.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100/70 transition-colors"
          >
            <span className="text-sm font-medium text-foreground">{item.name}</span>
            <span className="text-xs font-semibold text-orange-700">
              {toArabicNumber(item.stock)} وحدة
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
