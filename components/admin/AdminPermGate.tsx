'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { canOpen, useMyPerms } from '@/lib/admin/perms'

export default function AdminPermGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const my = useMyPerms()

  if (!my) return <p className="text-sm text-muted">جارٍ التحقق من الصلاحيات...</p>

  if (!canOpen(my, pathname)) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">لا تملك صلاحية لهذه الصفحة</h1>
        <p className="text-sm text-muted">تواصل مع المشرف العام إذا كنت تحتاج هذا القسم.</p>
        <Link href="/admin" className="text-sm font-semibold underline">
          العودة للرئيسية
        </Link>
      </div>
    )
  }
  return <>{children}</>
}
