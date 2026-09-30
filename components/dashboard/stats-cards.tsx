"use client"

import Link from "next/link"
import { Wallet, DollarSign, Package, Users, type LucideIcon } from "lucide-react"
import { useStore, formatIQD, toArabicNumber } from "@/components/store/store-context"

type Stat = {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
  iconClass: string
  href?: string
}

export function StatsCards() {
  const { debtors, products, orders, isLoading } = useStore()
  const unpaid = debtors.filter((d) => !d.paid)
  const totalDebts = unpaid.reduce((sum, d) => sum + d.amount, 0)
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length
  const loading = "جار التحميل..."

  const stats: Stat[] = [
    {
      title: "مبيعات اليوم",
      value: "—",
      subtitle: "لا يوجد مصدر مبيعات مرتبط",
      icon: DollarSign,
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "إجمالي الديون",
      value: isLoading ? loading : formatIQD(totalDebts),
      subtitle: `على ${toArabicNumber(unpaid.length)} زبائن`,
      icon: Wallet,
      iconClass: "bg-orange-100 text-orange-700",
      href: "/dashboard/debts",
    },
    {
      title: "المنتجات في المخزن",
      value: isLoading ? loading : toArabicNumber(products.length),
      subtitle: `${toArabicNumber(lowStock)} قاربت النفاد`,
      icon: Package,
      iconClass: "bg-primary/10 text-primary",
      href: "/dashboard/inventory",
    },
    {
      title: "عدد الزبائن",
      value: orders.length ? "بيانات الطلبات" : "—",
      subtitle: "لا يوجد مصدر زبائن مرتبط",
      icon: Users,
      iconClass: "bg-red-100 text-red-700",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => {
        const body = (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted">{s.title}</p>
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${s.iconClass}`}>
                <s.icon aria-hidden="true" className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight">{s.value}</p>
            <p className="mt-2 text-xs text-muted">{s.subtitle}</p>
          </>
        )
        const cls = "rounded-xl border border-border bg-card p-5 transition-colors"
        return s.href ? (
          <Link key={s.title} href={s.href} className={`${cls} hover:border-foreground/30`}>
            {body}
          </Link>
        ) : (
          <article key={s.title} className={cls}>
            {body}
          </article>
        )
      })}
    </div>
  )
}
