"use client"

import { useStore, formatIQD } from "@/components/store/store-context"

function chip(status: string) {
  if (status === "مكتمل") return "bg-emerald-100 text-emerald-700"
  if (status === "ملغى") return "bg-red-100 text-red-700"
  return "bg-orange-100 text-orange-700"
}

export function RecentOrders() {
  const { orders } = useStore()
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">آخر الفواتير</h2>
        <span className="text-xs text-muted">اليوم</span>
      </div>
      {orders.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">لا توجد فواتير حقيقية بعد.</p>
      ) : (
        <ul className="divide-y divide-border">
          {orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{order.customer}</p>
                <p className="text-[11px] text-muted">{order.id}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-[11px] ${chip(order.status)}`}>{order.status}</span>
                <span className="text-sm font-semibold">{formatIQD(order.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
