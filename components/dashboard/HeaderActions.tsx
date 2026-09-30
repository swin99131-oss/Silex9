'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useStore } from '@/components/store/store-context'
import { supabase } from '@/lib/supabase'

type Me = { store_name: string | null; full_name: string | null; avatar_url: string | null }

export default function HeaderActions() {
  const { notifications } = useStore()
  const [open, setOpen] = useState(false)
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    let alive = true
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id
      if (!uid) return
      const { data: p } = await supabase
        .from('profiles')
        .select('store_name, full_name, avatar_url')
        .eq('id', uid)
        .single()
      if (alive) setMe(p as Me | null)
    })
    return () => {
      alive = false
    }
  }, [])

  const initial = (me?.store_name ?? me?.full_name ?? '؟').charAt(0)

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          aria-label="الإشعارات"
          onClick={() => setOpen((v) => !v)}
          className="relative flex size-10 items-center justify-center rounded-full hover:bg-chip"
        >
          <Bell className="size-5" />
          {notifications.length > 0 && (
            <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] text-white">
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          )}
        </button>
        {open && (
          <div className="absolute left-0 top-12 z-50 w-80 rounded-2xl border border-border bg-card p-2 text-right shadow-soft">
            <p className="px-3 py-2 text-sm font-semibold">الإشعارات</p>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted">لا توجد إشعارات حالياً.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="rounded-xl px-3 py-2 hover:bg-chip">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <Link href="/profile" aria-label="حسابي" className="flex items-center rounded-full px-1 py-1 hover:bg-chip">
        {me?.avatar_url ? (
          <img src={me.avatar_url} alt="" className="size-8 rounded-full object-cover" />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-bold">{initial}</span>
        )}
      </Link>
    </div>
  )
}
