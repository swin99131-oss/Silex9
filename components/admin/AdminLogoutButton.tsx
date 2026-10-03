'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export default function AdminLogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    if (busy) return
    setBusy(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('تعذّر تسجيل الخروج، حاول مجدداً')
      setBusy(false)
      return
    }
    toast.success('تم تسجيل الخروج بنجاح')
    router.replace('/onboarding')
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void logout()}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-chip disabled:opacity-60"
    >
      {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <LogOut aria-hidden="true" className="size-4 shrink-0" />}
      <span>{busy ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}</span>
    </button>
  )
}
