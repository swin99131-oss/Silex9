'use client'

import { useCallback, useEffect, useState } from 'react'
import { logAction } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'
import { AD_STATUS, AD_TYPE_LABEL } from '@/lib/ad-templates'

type Row = {
  id: string
  merchant_id: string
  type: string
  title: string
  image_url: string | null
  status: string
  price: number
  total_budget: number
  is_free: boolean
  duration_days: number
  target_province: string | null
  payment_ref: string | null
  receipt_path: string | null
  review_note: string | null
  created_at: string
}
type Tab = 'pending_review' | 'pending_payment' | 'active' | 'all'
type Decision = 'approve' | 'reject' | 'return_payment' | 'pause' | 'resume'

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending_review', label: 'بانتظار المراجعة' },
  { key: 'pending_payment', label: 'بانتظار الدفع' },
  { key: 'active', label: 'نشطة' },
  { key: 'all', label: 'الكل' },
]

const DECISIONS: Record<Decision, { title: string; confirm: string; note: boolean }> = {
  approve: { title: 'الموافقة على الإعلان', confirm: 'موافقة', note: false },
  reject: { title: 'رفض الإعلان', confirm: 'رفض', note: true },
  return_payment: { title: 'إرجاع الإعلان لمرحلة الدفع', confirm: 'إرجاع', note: true },
  pause: { title: 'إيقاف الإعلان', confirm: 'إيقاف', note: false },
  resume: { title: 'استئناف الإعلان', confirm: 'استئناف', note: false },
}

const fmtIQD = (n: number) => `${Number(n || 0).toLocaleString('ar')} د.ع`
const btn = 'rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50'

function errText(e: unknown) {
  const m = (e as { message?: string } | null)?.message ?? ''
  if (m.includes('NOT_REVIEWABLE')) return 'لا يمكن تنفيذ هذا الإجراء على حالة الإعلان الحالية، حدّث الصفحة وحاول مجدداً'
  if (m.includes('FORBIDDEN')) return 'ليست لديك صلاحية الأدمن'
  return m || 'خطأ غير معروف'
}

export default function CampaignsPage() {
  const [tab, setTab] = useState<Tab>('pending_review')
  const [rows, setRows] = useState<Row[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [dlg, setDlg] = useState<{ row: Row; decision: Decision } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('campaigns')
      .select(
        'id, merchant_id, type, title, image_url, status, price, total_budget, is_free, duration_days, target_province, payment_ref, receipt_path, review_note, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(100)
    if (tab !== 'all') q = q.eq('status', tab)
    const { data, error: e } = await q
    if (e) {
      setError(e.message)
      setLoading(false)
      return
    }
    const list = (data ?? []) as Row[]
    setRows(list)
    const ids = Array.from(new Set(list.map((r) => r.merchant_id)))
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, store_name, full_name, username').in('id', ids)
      const map: Record<string, string> = {}
      for (const p of (ps ?? []) as { id: string; store_name: string | null; full_name: string | null; username: string | null }[]) {
        map[p.id] = p.store_name || p.full_name || p.username || 'تاجر'
      }
      setNames(map)
    }
    setError('')
    setLoading(false)
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  async function openReceipt(path: string) {
    const { data, error: e } = await supabase.storage.from('receipts').createSignedUrl(path, 300)
    if (e || !data) {
      setError('تعذّر فتح الإيصال')
      return
    }
    setReceiptUrl(data.signedUrl)
  }

  function ask(row: Row, decision: Decision) {
    setNote('')
    setOk('')
    setError('')
    setDlg({ row, decision })
  }

  async function decide() {
    if (!dlg) return
    const cfg = DECISIONS[dlg.decision]
    if (cfg.note && note.trim().length < 3) {
      setError('اكتب سبباً واضحاً (3 أحرف على الأقل)')
      return
    }
    setBusy(true)
    const { error: e } = await supabase.rpc('admin_review_campaign', {
      p_campaign_id: dlg.row.id,
      p_decision: dlg.decision,
      p_note: cfg.note ? note.trim() : null,
    })
    setBusy(false)
    if (e) {
      setError(errText(e))
      return
    }
    try {
      await logAction('campaign.' + dlg.decision, 'campaigns', dlg.row.id, { title: dlg.row.title })
    } catch {}
    setDlg(null)
    setError('')
    setOk('تم تنفيذ الإجراء')
    void load()
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">الإعلانات</h1>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`${btn} ${tab === t.key ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">{ok}</p>}

      {loading ? (
        <p className="text-sm text-muted">جارٍ التحميل...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">لا توجد إعلانات هنا.</p>
      ) : (
        rows.map((r) => {
          const st = AD_STATUS[r.status] ?? { label: r.status, cls: 'bg-secondary text-muted' }
          const canApprove = r.is_free || !!r.receipt_path
          return (
            <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {AD_TYPE_LABEL[r.type] ?? r.type} · {names[r.merchant_id] ?? 'تاجر'}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
              </div>

              {r.type === 'promotion' && r.image_url && (
                <img src={r.image_url} alt="" className="h-32 w-full rounded-xl object-cover" />
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>{r.is_free ? 'مجاني' : fmtIQD(r.price || r.total_budget)}</span>
                <span>{r.duration_days} أيام</span>
                <span>{r.target_province ?? 'حسب المتجر'}</span>
                <span>{new Date(r.created_at).toLocaleDateString('ar')}</span>
              </div>

              {r.payment_ref && (
                <p className="text-xs">
                  رقم العملية: <span dir="ltr" className="font-mono">{r.payment_ref}</span>
                </p>
              )}
              {r.review_note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">ملاحظة سابقة: {r.review_note}</p>}

              <div className="flex flex-wrap items-center gap-2">
                {r.receipt_path && (
                  <button type="button" onClick={() => openReceipt(r.receipt_path as string)} className={`${btn} border border-border`}>
                    عرض الإيصال
                  </button>
                )}
                {r.status === 'pending_review' && (
                  <>
                    <button
                      type="button"
                      disabled={!canApprove}
                      onClick={() => ask(r, 'approve')}
                      className={`${btn} bg-green-600 text-white`}
                    >
                      موافقة
                    </button>
                    {!r.is_free && (
                      <button type="button" onClick={() => ask(r, 'return_payment')} className={`${btn} border border-border`}>
                        إرجاع للدفع
                      </button>
                    )}
                    <button type="button" onClick={() => ask(r, 'reject')} className={`${btn} bg-red-600 text-white`}>
                      رفض
                    </button>
                    {!canApprove && <span className="text-xs text-muted">لا يوجد إيصال لهذا الإعلان</span>}
                  </>
                )}
                {r.status === 'active' && (
                  <button type="button" onClick={() => ask(r, 'pause')} className={`${btn} border border-border`}>
                    إيقاف
                  </button>
                )}
                {r.status === 'paused' && (
                  <button type="button" onClick={() => ask(r, 'resume')} className={`${btn} border border-border`}>
                    استئناف
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}

      {dlg && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-card p-5">
            <h3 className="text-lg font-semibold">{DECISIONS[dlg.decision].title}</h3>
            <p className="text-sm text-muted">{dlg.row.title}</p>
            {DECISIONS[dlg.decision].note && (
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder="اكتب السبب ليصل للتاجر"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/40"
              />
            )}
            {error && <p className="rounded-lg bg-red-100 p-2 text-xs text-red-800">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={decide}
                className={`${btn} flex-1 py-2.5 text-sm ${dlg.decision === 'reject' ? 'bg-red-600 text-white' : 'bg-primary text-primary-foreground'}`}
              >
                {busy ? 'جارٍ التنفيذ...' : DECISIONS[dlg.decision].confirm}
              </button>
              <button type="button" disabled={busy} onClick={() => setDlg(null)} className={`${btn} border border-border py-2.5 text-sm`}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptUrl && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-4" onClick={() => setReceiptUrl(null)}>
          <img src={receiptUrl} alt="الإيصال" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
          <button type="button" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">
            إغلاق
          </button>
        </div>
      )}
    </div>
  )
}
