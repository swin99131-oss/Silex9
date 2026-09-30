'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { PAGE_SIZE, listAuditLogs } from '@/lib/admin/api'
import type { AuditLog } from '@/lib/admin/types'
import { supabase } from '@/lib/supabase'

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLog[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    listAuditLogs({ page })
      .then(async (res) => {
        const ids = Array.from(new Set(res.rows.map((r) => r.actor_id).filter(Boolean))) as string[]
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">سجل العمليات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      <DataTable<AuditLog>
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        columns={[
          { key: 'actor', header: 'المنفّذ', render: (r) => (r.actor_id ? names[r.actor_id] ?? '—' : '—') },
          { key: 'action', header: 'العملية', render: (r) => r.action },
          { key: 'entity', header: 'الكيان', render: (r) => r.entity_type ?? '—' },
          {
            key: 'details',
            header: 'التفاصيل',
            render: (r) => (
              <span className="line-clamp-2 max-w-xs text-xs" dir="ltr">
                {Object.keys(r.details ?? {}).length ? JSON.stringify(r.details) : '—'}
              </span>
            ),
          },
          { key: 'created', header: 'التاريخ', render: (r) => new Date(r.created_at).toLocaleString('ar') },
        ]}
      />
    </div>
  )
}
