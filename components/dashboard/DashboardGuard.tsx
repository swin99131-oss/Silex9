'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// حماية واجهة فقط؛ الحماية الحقيقية بسياسات RLS على جداول التاجر
export default function DashboardGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user.id
      if (!uid) {
        router.replace('/onboarding')
        return
      }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle()
      if (!alive) return
      if (p?.role !== 'merchant') {
        router.replace('/home')
        return
      }
      setAllowed(true)
    })()
    return () => {
      alive = false
    }
  }, [router])

  if (!allowed) {
    return <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-muted">جارٍ التحقق...</div>
  }
  return <>{children}</>
}
