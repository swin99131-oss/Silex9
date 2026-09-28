"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useStore, formatIQD } from "@/components/store/store-context"

export function RecentOrders() {
  const { orders } = useStore()
  return (
    <Card className="p-6 rounded-2xl border-0 shadow-sm bg-white transition-all duration-500 hover:shadow-md">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-foreground">آخر الفواتير</h2>
        <span className="text-xs text-muted-foreground">اليوم</span>
      </div>
      <div className="space-y-2">
        {orders.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">لا توجد فواتير حقيقية بعد.</p> : orders.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{order.customer}</p>
              <p className="text-[11px] text-muted-foreground">{order.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={`text-[10px] font-normal border ${
                  order.status === "مكتمل"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : order.status === "ملغى"
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-orange-100 text-orange-700 border-orange-200"
                }`}
              >
                {order.status}
              </Badge>
              <span className="text-sm font-semibold text-foreground">{formatIQD(order.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
