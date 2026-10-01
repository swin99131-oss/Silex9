'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCityStats } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'

type Cities = Awaited<ReturnType<typeof getCityStats>>
type Stats = {
  pendingAds: number
  openReports: number
  unverifiedMerchants: number
  users: number
  newUsers7: number
  merchants: number
  products: number
  orders: number
  activeAds: number
  revenue: number
}

async function count(table: string, build?: (q: any) => any) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  if (build) q = build(q)
  const { count: c, error } = await q
  if (error) throw new Error(error.message)
  return c ?? 0
}

const n = (v: number) => v.toLocaleString('ar')

export default function AdminHome() {
  const [s, setS] = useState<Stats | null>(null)
  const [cities, setCities] = useState<Cities>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    Promise.all([
      count('campaigns', (q) => q.eq('status', 'pending_review')),
      count('reports', (q) => q.eq('status', 'open')),
      count('profiles', (q) => q.eq('role', 'merchant').is('verified_at', null)),
      count('profiles'),
      count('profiles', (q) => q.gte('created_at', since)),
      count('profiles', (q) => q.eq('role', 'merchant')),
      count('products'),
      count('orders'),
      count('campaigns', (q) => q.eq('status', 'active')),
      supabase.from('campaigns').select('price').eq('is_free', false).in('status', ['active', 'paused', 'finished']),
      getCityStats(),
    ])
      .then(([pendingAds, openReports, unverifiedMerchants, users, newUsers7, merchants, products, orders, activeAds, rev, city]) => {
        if (rev.error) throw new Error(rev.error.message)
        const revenue = ((rev.data ?? []) as { price: number | null }[]).reduce((a, r) => a + Number(r.price ?? 0), 0)
        setS({ pendingAds, openReports, unverifiedMerchants, users, newUsers7, merchants, products, orders, activeAds, revenue })
        setCities(city)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ غير معروف'))
  }, [])

  const attention = [
    { label: 'إعلانات بانتظار المراجعة', value: s?.pendingAds, href: '/admin/campaigns' },
    { label: 'بلاغات مفتوحة', value: s?.openReports, href: '/admin/reports' },
    { label: 'تجار غير موثّقين', value: s?.unverifiedMerchants, href: '/admin/users' },
  ]
  const numbers = [
    { label: 'المستخدمون', value: s ? n(s.users) : '…', href: '/admin/users' },
    { label: 'جدد آخر 7 أيام', value: s ? n(s.newUsers7) : '…', href: '/admin/users' },
    { label: 'التجار', value: s ? n(s.merchants) : '…', href: '/admin/users' },
    { label: 'المنتجات', value: s ? n(s.products) : '…', href: '/admin/products' },
    { label: 'الطلبات', value: s ? n(s.orders) : '…', href: '/admin/orders' },
    { label: 'إعلانات نشطة', value: s ? n(s.activeAds) : '…', href: '/admin/campaigns' },
  ]
  const max = cities[0]?.count || 1

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">نظرة عامة</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">يحتاج انتباهك</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {attention.map((a) => {
            const hot = (a.value ?? 0) > 0
            return (
              <Link
                key={a.label}
                href={a.href}
                className={`rounded-2xl border p-4 transition-opacity hover:opacity-80 ${
                  hot ? 'border-amber-300 bg-amber-50' : 'border-border bg-card'
                }`}
              >
                <p className="text-xs text-muted">{a.label}</p>
                <p className="mt-1 font-display text-3xl">{a.value === undefined ? '…' : n(a.value)}</p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">الأرقام</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {numbers.map((c) => (
            <Link key={c.label} href={c.href} className="rounded-2xl border border-border bg-card p-4 transition-opacity hover:opacity-80">
              <p className="text-xs text-muted">{c.label}</p>
              <p className="mt-1 font-display text-3xl">{c.value}</p>
            </Link>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted">إيرادات الإعلانات المعتمدة</p>
          <p className="mt-1 font-display text-3xl">{s ? `${n(s.revenue)} د.ع` : '…'}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">المستخدمون حسب المدينة</h2>
        {cities.length === 0 ? (
          <p className="text-sm text-muted">لا توجد بيانات.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cities.slice(0, 10).map((c) => (
              <li key={c.city} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate">{c.city}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-chip">
                  <span className="block h-full rounded-full bg-ink" style={{ width: `${(c.count / max) * 100}%` }} />
                </span>
                <span className="w-10 text-left text-muted">{c.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
