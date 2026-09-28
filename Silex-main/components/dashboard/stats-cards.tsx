"use client"

import { Wallet, DollarSign, Package, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useState } from "react"
import { useStore, formatIQD, toArabicNumber } from "@/components/store/store-context"

export function StatsCards() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const { debtors, products, orders, isLoading } = useStore()
  const totalDebts = debtors.filter((debtor) => !debtor.paid).reduce((sum, debtor) => sum + debtor.amount, 0)
  const stats = [
    { title: "مبيعات اليوم", value: "لا توجد بيانات", icon: DollarSign, subtitle: "لا يوجد مصدر مبيعات مرتبط", bgColor: "bg-emerald-50", textColor: "text-emerald-800", iconBg: "bg-emerald-600" },
    { title: "إجمالي الديون", value: isLoading ? "جار التحميل..." : formatIQD(totalDebts), icon: Wallet, subtitle: `على ${toArabicNumber(debtors.filter((debtor) => !debtor.paid).length)} زبائن`, bgColor: "bg-orange-50", textColor: "text-orange-800", iconBg: "bg-orange-600" },
    { title: "المنتجات في المخزن", value: isLoading ? "جار التحميل..." : toArabicNumber(products.length), icon: Package, subtitle: `${toArabicNumber(products.filter((product) => product.stock > 0 && product.stock <= 10).length)} قاربت النفاد`, bgColor: "bg-white", textColor: "text-foreground", iconBg: "bg-primary" },
    { title: "عدد الزبائن", value: orders.length ? "بيانات الطلبات" : "لا توجد بيانات", icon: Users, subtitle: "لا يوجد مصدر زبائن مرتبط", bgColor: "bg-red-50", textColor: "text-red-800", iconBg: "bg-red-600" },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <Card
          key={stat.title}
          onMouseEnter={() => setHoveredCard(index)}
          onMouseLeave={() => setHoveredCard(null)}
          style={{ animationDelay: `${index * 100}ms` }}
          className={`${stat.bgColor} ${stat.textColor} p-4 rounded-2xl border-0 transition-all duration-500 ease-out animate-slide-in-up cursor-pointer ${
            hoveredCard === index ? "scale-105 shadow-xl" : "shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xs font-medium opacity-90">{stat.title}</h3>
            <div
              className={`w-8 h-8 rounded-full ${stat.iconBg} flex items-center justify-center transition-transform duration-300 ${
                hoveredCard === index ? "scale-110" : ""
              }`}
            >
              <stat.icon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mb-2">{stat.value}</p>
          <div className="flex items-center gap-1.5 text-xs opacity-80">
            {stat.subtitle && <span>{stat.subtitle}</span>}
          </div>
        </Card>
      ))}
    </div>
  )
}
