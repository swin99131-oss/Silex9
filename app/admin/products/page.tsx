'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { StatusChip } from '@/components/admin/StatusChip'
import { PAGE_SIZE, listProducts } from '@/lib/admin/api'
import type { WithCity } from '@/lib/admin/api'
import type { Product } from '@/lib/admin/types'

type Row = WithCity<Product>

export default function ProductsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await listProducts({ page, search })
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
      <h1 className="text-2xl font-semibold">المنتجات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      <DataTable<Row>
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
        searchPlaceholder="بحث باسم المنتج..."
        columns={[
          { key: 'title', header: 'المنتج', render: (r) => r.title },
          { key: 'category', header: 'التصنيف', render: (r) => r.category ?? '—' },
          { key: 'city', header: 'مدينة التاجر', render: (r) => r.city ?? '—' },
          { key: 'price', header: 'السعر', render: (r) => r.price ?? '—' },
          { key: 'stock', header: 'المخزون', render: (r) => r.stock ?? '—' },
          {
            key: 'active',
            header: 'الحالة',
            render: (r) => (
              <StatusChip status={r.is_active ? 'success' : 'danger'}>
                {r.is_active ? 'نشط' : 'غير نشط'}
              </StatusChip>
            ),
          },
          { key: 'views', header: 'المشاهدات', render: (r) => r.views ?? 0 },
          {
            key: 'created',
            header: 'الإضافة',
            render: (r) => new Date(r.created_at).toLocaleDateString('ar'),
          },
        ]}
      />
    </div>
  )
}
