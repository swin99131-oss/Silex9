'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { PAGE_SIZE, listReports } from '@/lib/admin/api'
import type { WithCity } from '@/lib/admin/api'
import type { Report } from '@/lib/admin/types'
import { supabase } from '@/lib/supabase'

type Row = WithCity<Report>

export default function ReportsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    listReports({ page })
      .then(async (res) => {
        const ids = Array.from(
          new Set(res.rows.flatMap((r) => [r.reporter_id, r.reported_id]).filter(Boolean)),
        ) as string[]
        if (ids.length) {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, display_name, store_name')
            .in('id', ids)
          const map: Record<string, string> = {}
          for (const p of data ?? []) {
            map[p.id] = p.store_name || p.full_name || p.display_name || 'بدون اسم'
          }
          setNames(map)
        }
        setRows(res.rows)
        setTotal(res.total)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ غير معروف'))
      .finally(() => setLoading(false))
  }, [page])

  const name = (id: string | null) => (id ? names[id] ?? '—' : '—')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">الشكاوى والبلاغات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      <DataTable<Row>
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        columns={[
          { key: 'reporter', header: 'المُبلِّغ', render: (r) => name(r.reporter_id) },
          { key: 'reported', header: 'المُبلَّغ عنه', render: (r) => name(r.reported_id) },
          { key: 'city', header: 'مدينة المُبلَّغ عنه', render: (r) => r.city ?? '—' },
          { key: 'reason', header: 'السبب', render: (r) => r.reason ?? '—' },
          {
            key: 'post',
            header: 'المنشور',
            render: (r) =>
              r.post_id ? (
                <a href={`/post/${r.post_id}`} target="_blank" rel="noreferrer" className="text-sm font-semibold underline">
                  عرض
                </a>
              ) : (
                '—'
              ),
          },
          {
            key: 'details',
            header: 'التفاصيل',
            render: (r) => (
              <span className="line-clamp-2 max-w-xs">{r.details ?? '—'}</span>
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
