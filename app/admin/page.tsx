'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCityStats, getCounts } from '@/lib/admin/api'

type Counts = Awaited<ReturnType<typeof getCounts>>
type Cities = Awaited<ReturnType<typeof getCityStats>>

const CARDS: { key: keyof Counts; label: string; href: string }[] = [
  { key: 'users', label: 'المستخدمون', href: '/admin/users' },
  { key: 'merchants', label: 'التجار', href: '/admin/merchants' },
  { key: 'products', label: 'المنتجات', href: '/admin/products' },
  { key: 'orders', label: 'الطلبات', href: '/admin/orders' },
  { key: 'reports', label: 'البلاغات', href: '/admin/reports' },
  { key: 'campaigns', label: 'الإعلانات', href: '/admin/campaigns' },
]

export default function AdminHome() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [cities, setCities] = useState<Cities>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getCounts(), getCityStats()])
      .then(([c, s]) => {
        setCounts(c)
        setCities(s)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ غير معروف'))
  }, [])

  const max = cities[0]?.count || 1

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">نظرة عامة</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="rounded-2xl border border-border bg-card p-4 transition-opacity hover:opacity-80"
          >
            <p className="text-xs text-muted">{c.label}</p>
            <p className="mt-1 font-display text-3xl">{counts ? counts[c.key] : '…'}</p>
          </Link>
        ))}
      </div>

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
                  <span
                    className="block h-full rounded-full bg-ink"
                    style={{ width: `${(c.count / max) * 100}%` }}
                  />
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
