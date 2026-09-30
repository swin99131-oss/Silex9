'use client'

import { useCallback, useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { PAGE_SIZE, listCampaignsByStatus, setCampaignStatus } from '@/lib/admin/api'
import type { WithCity } from '@/lib/admin/api'
import type { Campaign } from '@/lib/admin/types'
import { AD_STATUS, AD_TYPE_LABEL } from '@/lib/ad-templates'
import { supabase } from '@/lib/supabase'

type Row = WithCity<Campaign>
type Tab = 'pending_review' | 'all'

export default function CampaignsPage() {
  const [tab, setTab] = useState<Tab>('pending_review')
  const [rows, setRows] = useState<Row[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    listCampaignsByStatus({ page }, tab === 'all' ? undefined : tab)
      .then(async (res) => {
        const ids = Array.from(new Set(res.rows.map((r) => r.merchant_id).filter(Boolean))) as string[]
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
  }, [page, tab])

  useEffect(() => {
    load()
  }, [load])

  async function act(r: Row, status: 'active' | 'rejected' | 'paused', msg: string) {
    if (!window.confirm(msg)) return
    setBusyId(r.id)
    try {
      await setCampaignStatus(r.id, status)
      setError('')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setBusyId(null)
    }
  }

  const btn = 'rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50'

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">الإعلانات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}

      <div className="flex gap-2">
        {([
          ['pending_review', 'بانتظار المراجعة'],
          ['all', 'الكل'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setPage(0)
              setTab(key)
            }}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              tab === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <DataTable<Row>
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        columns={[
          { key: 'merchant', header: 'التاجر', render: (r) => names[r.merchant_id] ?? '—' },
          { key: 'title', header: 'العنوان', render: (r) => <span className="line-clamp-2 max-w-xs">{r.title ?? '—'}</span> },
          { key: 'type', header: 'النوع', render: (r) => (r.type ? AD_TYPE_LABEL[r.type] ?? r.type : '—') },
          {
            key: 'budget',
            header: 'الميزانية',
            render: (r) => (r.total_budget != null ? `${r.total_budget.toLocaleString('ar')} د.ع · ${r.duration_days ?? '—'} أيام` : '—'),
          },
          { key: 'target', header: 'الاستهداف', render: (r) => r.target_province ?? 'كل العراق' },
          {
            key: 'status',
            header: 'الحالة',
            render: (r) => {
              const st = AD_STATUS[r.status ?? ''] ?? { label: r.status ?? '—', cls: 'bg-chip text-muted' }
              return <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
            },
          },
          {
            key: 'created',
            header: 'التاريخ',
            render: (r) => new Date(r.created_at).toLocaleDateString('ar'),
          },
          {
            key: 'act',
            header: '',
            render: (r) => (
              <div className="flex gap-2">
                {r.status === 'pending_review' && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => act(r, 'active', 'قبول هذا الإعلان وتفعيله؟')}
                      className={`${btn} bg-emerald-600 text-white`}
                    >
                      قبول
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => act(r, 'rejected', 'رفض هذا الإعلان؟')}
                      className={`${btn} bg-red-600 text-white`}
                    >
                      رفض
                    </button>
                  </>
                )}
                {r.status === 'active' && (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => act(r, 'paused', 'إيقاف هذا الإعلان مؤقتاً؟')}
                    className={`${btn} border border-border`}
                  >
                    إيقاف
                  </button>
                )}
                {r.status === 'paused' && (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => act(r, 'active', 'إعادة تشغيل هذا الإعلان؟')}
                    className={`${btn} border border-border`}
                  >
                    تشغيل
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
