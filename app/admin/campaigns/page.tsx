'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { StatusChip } from '@/components/admin/StatusChip'
import { PAGE_SIZE, listCampaigns } from '@/lib/admin/api'
import type { WithCity } from '@/lib/admin/api'
import type { Campaign } from '@/lib/admin/types'

type Row = WithCity<Campaign>

const TYPES: Record<string, string> = {
  hero: 'بانر رئيسي',
  slide: 'شريحة مربعة',
  featured: 'بطاقة مميزة',
}

export default function CampaignsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    listCampaigns({ page })
      .then((res) => {
        setRows(res.rows)
        setTotal(res.total)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ غير معروف'))
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">الإعلانات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      <DataTable<Row>
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        columns={[
          { key: 'title', header: 'الإعلان', render: (r) => r.title ?? '—' },
          { key: 'type', header: 'النوع', render: (r) => (r.type && TYPES[r.type]) || r.type || '—' },
          { key: 'city', header: 'مدينة التاجر', render: (r) => r.city ?? '—' },
          { key: 'target', header: 'المحافظة المستهدفة', render: (r) => r.target_province ?? 'الكل' },
          {
            key: 'budget',
            header: 'الميزانية',
            render: (r) => (r.total_budget ?? 0).toLocaleString('ar'),
          },
          { key: 'days', header: 'المدة (يوم)', render: (r) => r.duration_days ?? '—' },
          {
            key: 'status',
            header: 'الحالة',
            render: (r) => (
              <StatusChip
                status={r.status === 'active' ? 'success' : r.status === 'rejected' ? 'danger' : 'neutral'}
              >
                {r.status ?? '—'}
              </StatusChip>
            ),
          },
          {
            key: 'created',
            header: 'التاريخ',
            render: (r) => new Date(r.created_at).toLocaleDateString('ar'),
          },
        ]}
      />
    </div>
  )
}
