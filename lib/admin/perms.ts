'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export const PERMS = [
  { key: 'reports', label: 'البلاغات والمحادثات المُبلَّغ عنها' },
  { key: 'campaigns', label: 'مراجعة الإعلانات' },
  { key: 'verifications', label: 'طلبات التوثيق' },
  { key: 'pricing', label: 'أسعار الإعلانات والقوالب' },
  { key: 'users', label: 'المستخدمون والتجار (حظر وتعديل)' },
  { key: 'products', label: 'المنتجات' },
  { key: 'orders', label: 'الطلبات' },
  { key: 'audit', label: 'سجل العمليات' },
  { key: 'settings', label: 'إعدادات المنصة' },
] as const

const ROUTE_PERMS: Record<string, string> = {
  '/admin/reports': 'reports',
  '/admin/chats': 'reports',
  '/admin/campaigns': 'campaigns',
  '/admin/verifications': 'verifications',
  '/admin/ad-pricing': 'pricing',
  '/admin/users': 'users',
  '/admin/merchants': 'users',
  '/admin/products': 'products',
  '/admin/orders': 'orders',
  '/admin/audit-log': 'audit',
  '/admin/settings': 'settings',
  '/admin/staff': 'super',
}

export type MyPerms = { admin: boolean; super: boolean; perms: string[] }

let cache: Promise<MyPerms> | null = null

export function loadMyPerms(): Promise<MyPerms> {
  if (!cache) {
    cache = Promise.resolve(supabase.rpc('my_admin_permissions')).then(({ data, error }) => {
      if (error || !data) {
        cache = null
        console.warn('تعذر جلب الصلاحيات', error?.message)
        return { admin: true, super: true, perms: [] }
      }
      return data as MyPerms
    })
  }
  return cache
}

export function useMyPerms() {
  const [my, setMy] = useState<MyPerms | null>(null)
  useEffect(() => {
    let alive = true
    loadMyPerms().then((v) => {
      if (alive) setMy(v)
    })
    return () => {
      alive = false
    }
  }, [])
  return my
}

export function permFor(pathname: string): string | null {
  const hit = Object.keys(ROUTE_PERMS)
    .filter((p) => pathname === p || pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0]
  return hit ? ROUTE_PERMS[hit] : null
}

export function canOpen(my: MyPerms | null, pathname: string): boolean {
  if (!my) return pathname === '/admin'
  if (my.super) return true
  const perm = permFor(pathname)
  if (!perm) return true
  if (perm === 'super') return false
  return my.perms.includes(perm)
}
