'use client'

import { useCallback, useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import {
  PAGE_SIZE,
  deletePostByAdmin,
  listReportsByStatus,
  resolveReport,
  sendNotification,
} from '@/lib/admin/api'
import type { WithCity } from '@/lib/admin/api'
import type { Report } from '@/lib/admin/types'
import { supabase } from '@/lib/supabase'

type Row = WithCity<Report>
type Tab = 'open' | 'all'

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'مفتوح', cls: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'تمت المعالجة', cls: 'bg-emerald-100 text-emerald-700' },
  dismissed: { label: 'تم التجاهل', cls: 'bg-chip text-muted' },
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('open')
  const [rows, setRows] = useState<Row[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    listReportsByStatus({ page }, tab === 'all' ? undefined : tab)
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
  }, [page, tab])

  useEffect(() => {
    load()
  }, [load])

  async function run(r: Row, fn: () => Promise<string>) {
    setBusyId(r.id)
    setOk('')
    setError('')
    try {
      setOk(await fn())
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setBusyId(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function close(r: Row, status: 'resolved' | 'dismissed') {
    const note = window.prompt('ملاحظة داخلية (اختياري)')
    if (note === null) return
    return run(r, async () => {
      await resolveReport(r.id, status, note)
      return 'تم تحديث البلاغ'
    })
  }

  function message(r: Row, who: 'reported' | 'reporter') {
    const userId = who === 'reported' ? r.reported_id : r.reporter_id
    if (!userId) return
    const text = window.prompt(who === 'reported' ? 'نص التنبيه للمُبلَّغ عنه' : 'نص الرسالة للمُبلِّغ')
    if (!text?.trim()) return
    return run(r, async () => {
      await sendNotification(userId, 'رسالة من إدارة سالِكس', text.trim())
      return 'تم إرسال التنبيه'
    })
  }

  function removePost(r: Row) {
    if (!r.post_id) return
    if (!window.confirm('حذف هذا المنشور نهائياً؟ سيصل صاحبه تنبيه بذلك.')) return
    return run(r, async () => {
      const res = await deletePostByAdmin(r.post_id as string, r.id, r.reported_id)
      return res.notified ? 'تم حذف المنشور وإبلاغ صاحبه' : 'تم حذف المنشور، لكن تعذر إرسال التنبيه لصاحبه'
    })
  }

  const name = (id: string | null) => (id ? names[id] ?? '—' : '—')
  const btn = 'rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50'

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">الشكاوى والبلاغات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">{ok}</p>}

      <div className="flex gap-2">
        {([
          ['open', 'المفتوحة'],
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
              <div className="max-w-xs">
                <span className="line-clamp-2">{r.details ?? '—'}</span>
                {r.admin_note && <span className="mt-1 block text-xs text-muted">ملاحظة: {r.admin_note}</span>}
              </div>
            ),
          },
          {
            key: 'status',
            header: 'الحالة',
            render: (r) => {
              const st = STATUS[r.status] ?? { label: r.status, cls: 'bg-chip text-muted' }
              return <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
            },
          },
          { key: 'created', header: 'التاريخ', render: (r) => new Date(r.created_at).toLocaleDateString('ar') },
          {
            key: 'act',
            header: '',
            render: (r) => (
              <div className="flex max-w-[15rem] flex-wrap gap-2">
                {r.status === 'open' && (
                  <>
                    <button type="button" disabled={busyId === r.id} onClick={() => close(r, 'resolved')} className={`${btn} bg-emerald-600 text-white`}>
                      تمت المعالجة
                    </button>
                    <button type="button" disabled={busyId === r.id} onClick={() => close(r, 'dismissed')} className={`${btn} border border-border`}>
                      تجاهل
                    </button>
                  </>
                )}
                <button type="button" disabled={busyId === r.id || !r.reported_id} onClick={() => message(r, 'reported')} className={`${btn} border border-border`}>
                  تنبيه المُبلَّغ عنه
                </button>
                <button type="button" disabled={busyId === r.id || !r.reporter_id} onClick={() => message(r, 'reporter')} className={`${btn} border border-border`}>
                  مراسلة المُبلِّغ
                </button>
                {r.post_id && (
                  <button type="button" disabled={busyId === r.id} onClick={() => removePost(r)} className={`${btn} bg-red-600 text-white`}>
                    حذف المنشور
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
