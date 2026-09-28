"use client"

import { Bell, AlertTriangle, PackageCheck, MessageCircle, Megaphone } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MobileNav } from "./mobile-nav"
import { useStore } from "@/components/store/store-context"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useEffect, useState as useState2 } from "react"
import type { ReactNode } from "react"
import { useState } from "react"

interface HeaderProps {
  title: string
  description: string
  actions?: ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  const { query, setQuery, notifications } = useStore()
  const router = useRouter()
  const [me, setMe] = useState2<{ store_name: string | null; full_name: string | null; avatar_url: string | null } | null>(null)

  useEffect(() => {
    let alive = true
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id
      if (!uid) return
      supabase
        .from("profiles")
        .select("store_name, full_name, avatar_url")
        .eq("id", uid)
        .single()
        .then(({ data: p }) => {
          if (alive) setMe(p as any)
        })
    })
    return () => {
      alive = false
    }
  }, [])
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="space-y-3 md:space-y-4 animate-slide-in-up relative">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <MobileNav />

          <div className="relative flex-1 max-w-md">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج أو زبون"
              className="pe-3 ps-3 h-9 text-sm bg-card border-border transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="relative">
            <button
              className="relative hover:bg-secondary transition-all duration-300 hover:scale-110 h-8 w-8 rounded-lg flex items-center justify-center"
              onClick={() => setShowNotifications((value) => !value)}
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 end-1.5 min-w-4 h-4 px-1 flex items-center justify-center text-[9px] bg-destructive text-white rounded-full animate-pulse">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute left-0 top-12 z-50 w-80 rounded-xl border bg-popover shadow-xl p-2">
                <div className="flex items-center justify-between px-2 py-1.5 border-b">
                  <span className="text-sm font-semibold">الإشعارات</span>
                  <span className="text-[10px] text-muted-foreground">{notifications.length} جديد</span>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">لا توجد إشعارات حالياً.</div>
                  ) : (
                    notifications.map((item) => {
                      const iconClass =
                        item.type === "inventory"
                          ? "text-amber-600 bg-amber-100"
                          : item.type === "debt"
                            ? "text-red-600 bg-red-100"
                            : item.type === "order"
                              ? "text-primary-foreground bg-primary"
                              : "text-blue-600 bg-blue-100"

                      const Icon =
                        item.type === "inventory"
                          ? AlertTriangle
                          : item.type === "debt"
                            ? PackageCheck
                            : item.type === "order"
                              ? MessageCircle
                              : Megaphone

                      return (
                        <div key={item.id} className="flex gap-2 p-2 rounded-lg hover:bg-secondary/60">
                          <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-md ${iconClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.message}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2 pe-2 md:pe-3 border-e border-border"
            aria-label="حسابي"
          >
            <Avatar className="w-7 h-7 md:w-8 md:h-8 ring-2 ring-primary/20 transition-all duration-300 hover:ring-primary/40">
              {me?.avatar_url && <AvatarImage src={me.avatar_url} alt="" />}
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                {(me?.store_name ?? me?.full_name ?? "؟").charAt(0)}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1">{title}</h1>
        <p className="text-xs md:text-sm text-muted-foreground">{description}</p>
      </div>

      {actions && <div className="flex flex-col sm:flex-col md:flex-row gap-2">{actions}</div>}
    </header>
  )
}
