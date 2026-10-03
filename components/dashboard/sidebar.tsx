"use client"

import {
  LayoutDashboard,
  BookOpen,
  Warehouse,
  BarChart3,
  ClipboardList,
  Settings,
  HelpCircle,
  Store,
  Megaphone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menuItems = [
  { icon: LayoutDashboard, label: "لوحة التحكم", href: "/dashboard" },
  { icon: BookOpen, label: "دفتر الديون", href: "/dashboard/debts" },
  { icon: Warehouse, label: "المخازن", href: "/dashboard/inventory" },
  { icon: BarChart3, label: "تحليل المنتجات", href: "/dashboard/analytics" },
  { icon: ClipboardList, label: "الطلبات", href: "/dashboard/orders" },
  { icon: Megaphone, label: "الإعلانات", href: "/dashboard/ads" },
]

const generalItems = [
  { icon: Settings, label: "الإعدادات", href: "/dashboard/settings" },
  { icon: HelpCircle, label: "المساعدة", href: "/dashboard/help" },
]

export function Sidebar() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 end-0 w-64 bg-card border-s border-border p-4 h-screen overflow-y-auto lg:block">
      <div className="flex items-center gap-2 mb-6 group cursor-pointer">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
            <Store className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">متجري</span>
        </Link>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-2 tracking-wider">القائمة</p>
          <nav className="space-y-0.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    hoveredItem === item.label && !isActive && "-translate-x-1",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-2 tracking-wider">عام</p>
          <nav className="space-y-0.5">
            {generalItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    hoveredItem === item.label && !isActive && "-translate-x-1",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}
