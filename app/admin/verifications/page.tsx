'use client'

import { useCallback, useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { logAction } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'

type Row = {
  id: string
  user_id: string
  status: string
  requested_at: string
  reviewed_at: string | null
  review_note: string | null
  expires_at: string | null
  name: string
  username: string | null
  country: string | null
  city: string | null
  days: number
  followers: number
}
type Tab = 'pending' | 'all'

const KEYS = ['verification_min_days', 'verification_min_followers', 'verification_free_days', 'verification_price'] as const
type Cfg = Record<(typeof KEYS)[number], string>
const DEFAULT_CFG: Cfg = {
  verification_min_days: '30',
  verification_min_followers: '50',
  verification_free_days: '30',
  verification_price: '0',
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'بانتظار المراجعة', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'موثّق', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'مرفوض', cls: 'bg-red-100 text-red-700' },
  revoked: { label: 'ملغى', cls: 'bg-chip text-muted' },
}

const DIGITS = '٠١٢٣٤٥٦٧٨٩'
function toNum(s: string) {
  const ascii = s.replace(/[٠-٩]/g, (d) => String(DIGITS.indexOf(d))).replace(/[^\d]/g, '')
  return ascii ? Number(ascii) : 0
}

function countryName(code: string | null) {
  if (!code) return ''
  try {
    return new Intl.DisplayNames(['ar'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

const input = 'w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/40'

export default function VerificationsPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG)
  const [savingCfg, setSavingCfg] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: e } = await supabase.rpc('admin_list_verifications', { p_status: tab })
      if (e) throw new Error(e.message)
      setRows(Array.isArray(data) ? (data as Row[]) : [])
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', [...KEYS])
      .then(({ data }) => {
        const next: Cfg = { ...DEFAULT_CFG }
        for (const r of (data ?? []) as { key: keyof Cfg; value: string }[]) next[r.key] = r.value ?? ''
        setCfg(next)
      })
  }, [])

  async function review(r: Row, decision: 'approve' | 'reject' | 'revoke') {
    let note: string | null = null
    if (decision === 'approve') {
      if (!window.confirm('الموافقة على توثيق ' + r.name + '؟')) return
    } else {
      note = window.prompt(decision === 'reject' ? 'سبب الرفض (يظهر للتاجر)' : 'سبب إلغاء التوثيق (يظهر للتاجر)')
      if (note === null) return
    }
    setBusyId(r.id)
    setOk('')
    setError('')
    try {
      const { error: e } = await supabase.rpc('admin_review_verification', {
        p_id: r.id,
        p_decision: decision,
        p_note: note,
      })
      if (e) throw new Error(e.message)
      await logAction('verification.' + decision, 'profiles', r.user_id)
      setOk(decision === 'approve' ? 'تم توثيق الحساب' : decision === 'reject' ? 'تم رفض الطلب' : 'تم إلغاء التوثيق')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setBusyId(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function saveCfg() {
    setSavingCfg(true)
    setOk('')
    setError('')
    try {
      const { data: u } = await supabase.auth.getUser()
      const now = new Date().toISOString()
      const payload = KEYS.map((key) => ({
        key,
        value: String(toNum(cfg[key])),
        updated_at: now,
        updated_by: u.user?.id ?? null,
      }))
      const { data, error: e } = await supabase.from('platform_settings').upsert(payload).select('key')
      if (e) throw new Error(e.message)
      if (data?.length !== payload.length) throw new Error('لم يتم الحفظ، تحقق من الصلاحيات')
      await logAction('verification.settings', 'platform_settings')
      setOk('تم حفظ الشروط')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setSavingCfg(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const btn = 'rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50'
  const field = (key: keyof Cfg, label: string) => (
    <label className="flex flex-col gap-1 text-xs font-semibold">
      {label}
      <input
        className={input}
        inputMode="numeric"
        dir="ltr"
        value={cfg[key]}
        onChange={(e) => setCfg((c) => ({ ...c, [key]: e.target.value }))}
      />
    </label>
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">طلبات التوثيق</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">{ok}</p>}

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">الشروط والسعر</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {field('verification_min_days', 'أقل عمر للحساب (يوم)')}
          {field('verification_min_followers', 'أقل عدد متابعين')}
          {field('verification_free_days', 'مدة التوثيق المجاني (يوم)')}
          {field('verification_price', 'السعر بعد المجاني')}
        </div>
        <p className="text-xs text-muted">
          السعر يُطبَّق عند تفعيل نظام الدفع. التغيير يسري على الطلبات الجديدة فقط.
        </p>
        <button
          type="button"
          disabled={savingCfg}
          onClick={saveCfg}
          className="h-10 self-start rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          حفظ
        </button>
      </section>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {([
            ['pending', 'بانتظار المراجعة'],
            ['all', 'الكل'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
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
          total={rows.length}
          page={0}
          pageSize={Math.max(rows.length, 1)}
          onPageChange={() => {}}
          columns={[
            {
              key: 'name',
              header: 'المتجر',
              render: (r) => (
                <div>
                  <span className="font-medium">{r.name}</span>
                  {r.username && <span className="block text-xs text-muted">@{r.username}</span>}
                </div>
              ),
            },
            {
              key: 'place',
              header: 'الدولة والمدينة',
              render: (r) => [countryName(r.country), r.city].filter(Boolean).join('، ') || '—',
            },
            { key: 'days', header: 'عمر الحساب', render: (r) => r.days.toLocaleString('ar') + ' يوم' },
            { key: 'followers', header: 'المتابعون', render: (r) => r.followers.toLocaleString('ar') },
            {
              key: 'status',
              header: 'الحالة',
              render: (r) => {
                const st = STATUS[r.status] ?? { label: r.status, cls: 'bg-chip text-muted' }
                return (
                  <div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                    {r.review_note && <span className="mt-1 block max-w-[12rem] text-xs text-muted">{r.review_note}</span>}
                  </div>
                )
              },
            },
            { key: 'requested', header: 'تاريخ الطلب', render: (r) => new Date(r.requested_at).toLocaleDateString('ar') },
            {
              key: 'act',
              header: '',
              render: (r) => (
                <div className="flex gap-2">
                  {r.status === 'pending' && (
                    <>
                      <button type="button" disabled={busyId === r.id} onClick={() => review(r, 'approve')} className={`${btn} bg-emerald-600 text-white`}>
                        قبول
                      </button>
                      <button type="button" disabled={busyId === r.id} onClick={() => review(r, 'reject')} className={`${btn} bg-red-600 text-white`}>
                        رفض
                      </button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <button type="button" disabled={busyId === r.id} onClick={() => review(r, 'revoke')} className={`${btn} border border-border`}>
                      إلغاء التوثيق
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
