'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { PAGE_SIZE, listMerchants } from '@/lib/admin/api'
import type { Profile } from '@/lib/admin/types'

export default function MerchantsPage() {
  const [rows, setRows] = useState<Profile[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await listMerchants({ page, search })
        setRows(res.rows)
        setTotal(res.total)
        setError('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطأ غير معروف')
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [page, search])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">التجار</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      <DataTable<Profile>
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => {
          setPage(0)
          setSearch(v)
        }}
        searchPlaceholder="بحث باسم المتجر أو الهاتف..."
        columns={[
          { key: 'store', header: 'المتجر', render: (r) => r.store_name ?? '—' },
          { key: 'owner', header: 'المالك', render: (r) => r.full_name ?? r.display_name ?? '—' },
          { key: 'category', header: 'التصنيف', render: (r) => r.store_category ?? '—' },
          { key: 'city', header: 'المدينة', render: (r) => r.city ?? '—' },
          { key: 'whatsapp', header: 'واتساب', render: (r) => r.whatsapp ?? r.phone ?? '—' },
          {
            key: 'created',
            header: 'التسجيل',
            render: (r) => new Date(r.created_at).toLocaleDateString('ar'),
          },
        ]}
      />
    </div>
  )
}
